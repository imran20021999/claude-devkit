#!/usr/bin/env node
/**
 * pr-context: deterministic PR hygiene checks for /pr-review.
 *
 * Validates commit messages (Conventional Commits) and PR metadata (title, description, linked
 * issue). Pure helpers are exported for testing; the runtime gathers PR data via `gh` and prints JSON.
 *
 * Usage: node pr-context.mjs <pr-number>
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const CONVENTIONAL_TYPES = [
  'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert',
];

/** Parse a Conventional Commit subject: `type(scope)?!?: description`. */
export function parseConventionalCommit(subject, types = CONVENTIONAL_TYPES) {
  const s = String(subject).trim();
  const m = s.match(/^([a-zA-Z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/);
  if (!m) return { valid: false, reason: 'not in "type(scope): description" form' };
  const type = m[1].toLowerCase();
  if (!types.includes(type)) return { valid: false, type, reason: `unknown type "${type}"` };
  return { valid: true, type, scope: m[2] || null, breaking: Boolean(m[3]), description: m[4] };
}

/** Check a list of commit subjects. */
export function checkCommitMessages(subjects, types = CONVENTIONAL_TYPES) {
  return subjects.map((s) => ({ subject: s, ...parseConventionalCommit(s, types) }));
}

/** Detect a linked issue reference in text (e.g. "#123", "closes #123", ".../issues/5"). */
export function detectLinkedIssue(text) {
  const s = String(text || '');
  const m =
    s.match(/\b(?:close[sd]?|fixe[sd]?|resolve[sd]?)\s+#?\d+/i) ||
    s.match(/#\d+\b/) ||
    s.match(/\/issues\/\d+/);
  return m ? m[0] : null;
}

/** Check PR metadata hygiene; returns { ok, findings }. */
export function checkPrHygiene({ title, body } = {}, opts = {}) {
  const minBody = opts.minBody ?? 50;
  const findings = [];
  const t = (title || '').trim();
  if (!t) {
    findings.push({ field: 'title', severity: 'major', message: 'PR title is empty' });
  } else if (!parseConventionalCommit(t).valid) {
    findings.push({
      field: 'title',
      severity: 'major',
      message:
        'PR title must start with a Conventional Commit type: feat: (feature), fix: (bug fix), ' +
        'refactor:, perf:, docs:, test:, build:, ci:, chore:, or revert:',
    });
  }

  const b = (body || '').trim();
  if (!b) {
    findings.push({
      field: 'body',
      severity: 'major',
      message: 'PR description is empty — explain what changed and why, covering all the changes',
    });
  } else if (b.length < minBody) {
    findings.push({
      field: 'body',
      severity: 'minor',
      message: `PR description is too short (< ${minBody} chars) to explain the changes`,
    });
  }

  if (!detectLinkedIssue(`${t}\n${b}`))
    findings.push({ field: 'issue', severity: 'nit', message: 'No linked issue referenced' });

  return { ok: findings.length === 0, findings };
}

const BANG_TYPE = /^[a-zA-Z]+(?:\([^)]+\))?!:/;
const BREAKING_FOOTER = /(^|\n)BREAKING[ -]CHANGE:/i;

/** Detect whether the PR signals a breaking change (via `!` type or a BREAKING CHANGE footer). */
export function detectBreaking({ title = '', body = '', commitSubjects = [], commitBodies = [] } = {}) {
  const byBang =
    BANG_TYPE.test(String(title).trim()) ||
    commitSubjects.some((s) => BANG_TYPE.test(String(s).trim()));
  const byFooter =
    BREAKING_FOOTER.test(String(body)) ||
    commitBodies.some((b) => BREAKING_FOOTER.test(String(b)));
  return { breaking: byBang || byFooter, byBang, byFooter };
}

/** If a breaking change is signalled, require it be explained in the description. */
export function checkBreakingChange(args = {}) {
  const d = detectBreaking(args);
  if (!d.breaking) return { breaking: false, findings: [] };
  const body = String(args.body || '');
  const explained = BREAKING_FOOTER.test(body) || /breaking/i.test(body);
  const findings = explained
    ? []
    : [
        {
          field: 'breaking',
          severity: 'major',
          message:
            'Breaking change indicated (! in the type) but not explained — add a "BREAKING CHANGE:" section describing the impact and migration path.',
        },
      ];
  return { breaking: true, findings };
}

function lower(p) {
  return String(p).replace(/\\/g, '/').toLowerCase();
}

/** Is this path documentation (README/CHANGELOG/docs/*.md …)? */
export function isDocFile(path) {
  const p = lower(path);
  const base = p.split('/').pop() || '';
  return (
    /^(readme|changelog|contributing|license)/.test(base) ||
    /(^|\/)docs?\//.test(p) ||
    p.endsWith('.md') ||
    p.endsWith('.mdx') ||
    p.endsWith('.rst')
  );
}

/** Is this path source code (by a common extension)? */
export function isCodeFile(path) {
  const p = lower(path);
  if (isDocFile(p)) return false;
  return /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|cs|cpp|cc|c|h|hpp|rb|php|swift|dart|vue|svelte|scala|sh|sql)$/.test(p);
}

/** Flag when code changed but no docs were updated. */
export function checkDocsUpdated(changedFiles = []) {
  const files = changedFiles.map(String);
  const codeChanged = files.some(isCodeFile);
  const docsChanged = files.some(isDocFile);
  const needsDocs = codeChanged && !docsChanged;
  return {
    codeChanged,
    docsChanged,
    needsDocs,
    findings: needsDocs
      ? [
          {
            field: 'docs',
            severity: 'minor',
            message: 'Code changed but no docs/README/CHANGELOG updated — update docs if behavior or usage changed.',
          },
        ]
      : [],
  };
}

/** Extract heading titles (section names) from a PR template. */
export function parseTemplateSections(template) {
  return String(template || '')
    .split('\n')
    .filter((l) => /^#{1,6}\s+/.test(l))
    .map((l) => l.replace(/^#{1,6}\s+/, '').trim())
    .filter(Boolean);
}

/** Check that the PR body fills the repo's PR-template sections and has no leftover placeholders. */
export function checkTemplateAdherence(body, template) {
  if (!template) return { hasTemplate: false, findings: [] };
  const b = String(body || '');
  const sections = parseTemplateSections(template);
  const missing = sections.filter((s) => !b.toLowerCase().includes(s.toLowerCase()));
  const findings = [];
  if (missing.length)
    findings.push({
      field: 'template',
      severity: 'minor',
      message: `PR description is missing template section(s): ${missing.join(', ')}`,
    });
  if (/<!--[\s\S]*?-->/.test(b))
    findings.push({
      field: 'template',
      severity: 'nit',
      message: 'PR description still contains template comment placeholders (<!-- … -->) — fill or remove them.',
    });
  return { hasTemplate: true, findings };
}

// ---- runtime-only ----

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

function readTemplate(cwd) {
  const candidates = [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/pull_request_template.md',
    'PULL_REQUEST_TEMPLATE.md',
    'pull_request_template.md',
    'docs/PULL_REQUEST_TEMPLATE.md',
    'docs/pull_request_template.md',
  ];
  for (const c of candidates) {
    try {
      const p = join(cwd, c);
      if (existsSync(p)) return readFileSync(p, 'utf8');
    } catch {
      /* ignore */
    }
  }
  return null;
}

function main() {
  const pr = process.argv[2];
  if (!pr) {
    process.stderr.write('usage: pr-context.mjs <pr-number>\n');
    process.exit(1);
  }
  let data = {};
  try {
    data = JSON.parse(
      gh(['pr', 'view', pr, '--json', 'title,body,baseRefName,mergeStateStatus,statusCheckRollup,commits,files']) ||
        '{}',
    );
  } catch {
    data = {};
  }
  const subjects = (data.commits || []).map((c) => c.messageHeadline || '').filter(Boolean);
  const bodies = (data.commits || []).map((c) => c.messageBody || '').filter(Boolean);
  const changedFiles = (data.files || []).map((f) => f.path).filter(Boolean);
  const template = readTemplate(process.cwd());
  const context = {
    baseBranch: data.baseRefName || null,
    mergeStateStatus: data.mergeStateStatus || null,
    hygiene: checkPrHygiene({ title: data.title, body: data.body }),
    commits: checkCommitMessages(subjects),
    linkedIssue: detectLinkedIssue(`${data.title || ''}\n${data.body || ''}`),
    breaking: checkBreakingChange({ title: data.title, body: data.body, commitSubjects: subjects, commitBodies: bodies }),
    docs: checkDocsUpdated(changedFiles),
    template: checkTemplateAdherence(data.body, template),
  };
  process.stdout.write(JSON.stringify(context, null, 2) + '\n');
}

if (process.argv[1]?.endsWith('pr-context.mjs')) {
  main();
}
