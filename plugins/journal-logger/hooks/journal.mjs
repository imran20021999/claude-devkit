#!/usr/bin/env node
/**
 * journal-logger core library + CLI.
 *
 * CLI modes (all read context from a hook payload on stdin unless noted):
 *   --add            append an entry read as JSON from stdin; --session <id> clears that staging.
 *   --flush          --session <id>: clear a session's staging buffer.
 *   --safety-net     Stop hook: if staging has facts, write an `unclassified` entry and clear.
 *   --digest         SessionStart hook: print a bounded digest of the journal to stdout.
 *   --link           --session <id> [--commit <sha>] [--pr <url>]: backfill links, re-render.
 *   --render         rebuild JOURNAL.md from entries.jsonl.
 *
 * Pure helpers are exported for unit testing; nothing runs on import.
 */

import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

export const DEFAULT_CONFIG = {
  types: ['feature', 'enhancement', 'deprecation', 'bugfix', 'infra', 'deploy'],
  watch: {
    edits: true,
    bashPatterns: ['terraform', 'kubectl', 'helm', 'docker', 'docker-compose', 'alembic', 'migrate', 'deploy'],
  },
  digest: { recent: 15, windowDays: 30 },
  redact: {
    patterns: ['API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PASSWD', 'PRIVATE_KEY'],
    maxArgLen: 200,
  },
};

export function mergeConfig(user) {
  if (!user || typeof user !== 'object') return DEFAULT_CONFIG;
  return {
    types: Array.isArray(user.types) ? user.types : DEFAULT_CONFIG.types,
    watch: { ...DEFAULT_CONFIG.watch, ...(user.watch || {}) },
    digest: { ...DEFAULT_CONFIG.digest, ...(user.digest || {}) },
    redact: { ...DEFAULT_CONFIG.redact, ...(user.redact || {}) },
  };
}

export function paths(cwd) {
  const journalDir = join(cwd, '.devkit', 'journal');
  return {
    journalDir,
    entries: join(journalDir, 'entries.jsonl'),
    stagingDir: join(journalDir, '.staging'),
    config: join(journalDir, 'journal.json'),
    markdown: join(cwd, 'JOURNAL.md'),
  };
}

function sanitizeId(s) {
  return String(s || 'unknown').replace(/[^A-Za-z0-9._-]/g, '_');
}

export function stagingFile(cwd, sessionId) {
  return join(paths(cwd).stagingDir, `${sanitizeId(sessionId)}.jsonl`);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Normalize a path for display: backslashes -> slashes, strip a leading `./`. */
export function normalizeFile(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

/** ISO timestamp with milliseconds stripped. */
export function isoNow(date = new Date()) {
  return date.toISOString().replace(/\.\d+Z$/, 'Z');
}

/** Generate a sortable, mostly-unique id: <iso>-<rand>. */
export function generateId(date = new Date(), rand = () => randomBytes(2).toString('hex')) {
  return `${isoNow(date)}-${rand()}`;
}

/** Redact secret-like values and truncate overly long commands. */
export function redactCommand(cmd, patterns = DEFAULT_CONFIG.redact.patterns, maxLen = DEFAULT_CONFIG.redact.maxArgLen) {
  let out = String(cmd);
  for (const p of patterns) {
    const re = new RegExp(`(${escapeRe(p)}["']?\\s*[=:]\\s*["']?)([^\\s"']+)`, 'gi');
    out = out.replace(re, '$1[REDACTED]');
  }
  if (out.length > maxLen) out = out.slice(0, maxLen) + '…';
  return out;
}

/** True if `str` contains any of the substrings in `patterns`. */
export function matchesAny(str, patterns) {
  const s = String(str);
  return (patterns || []).some((p) => s.includes(p));
}

/** Detect a git/PR linkage signal in a bash command. */
export function detectLinkage(cmd) {
  const s = String(cmd);
  if (/\bgh\s+pr\s+create\b/.test(s)) return 'pr';
  if (/\bgit\s+commit\b/.test(s)) return 'commit';
  if (/\bgit\s+push\b/.test(s)) return 'push';
  return null;
}

/** Extract a PR URL (GitHub or Azure DevOps) from text. */
export function parsePrUrl(text) {
  const m = String(text).match(/https?:\/\/\S+?\/(?:pull|pullrequest)\/\d+/);
  return m ? m[0] : null;
}

/** Normalize a hook payload across naming variants. */
export function normalizePayload(p) {
  if (!p || typeof p !== 'object') return {};
  return {
    tool: p.tool_name ?? p.toolName ?? p.tool,
    input: p.tool_input ?? p.toolInput ?? {},
    output: p.tool_response ?? p.tool_output ?? p.output ?? '',
    cwd: p.cwd ?? p.workingDirectory ?? p.project_dir,
    sessionId: p.session_id ?? p.sessionId,
  };
}

/**
 * Turn a PostToolUse payload into staging facts (0 or more).
 * Change facts: edits and watched ops commands. Linkage facts carry a `linkage` field.
 */
export function extractFacts(payload, config = DEFAULT_CONFIG, now = new Date()) {
  const { tool, input } = normalizePayload(payload);
  const ts = isoNow(now);
  const facts = [];
  if (['Edit', 'Write', 'MultiEdit'].includes(tool)) {
    if (config.watch.edits !== false && input.file_path) {
      facts.push({ tool, file: normalizeFile(input.file_path), timestamp: ts });
    }
  } else if (tool === 'Bash') {
    const cmd = input.command || '';
    const linkage = detectLinkage(cmd);
    const redacted = redactCommand(cmd, config.redact.patterns, config.redact.maxArgLen);
    if (linkage) {
      facts.push({ tool: 'Bash', linkage, command: redacted, timestamp: ts });
    } else if (matchesAny(cmd, config.watch.bashPatterns)) {
      facts.push({ tool: 'Bash', command: redacted, timestamp: ts, tag: 'ops' });
    }
  }
  return facts;
}

/** Build a complete entry from a partial, filling defaults. */
export function buildEntry(partial = {}, { now = new Date(), sessionId, author, id } = {}) {
  return {
    id: id || partial.id || generateId(now),
    timestamp: partial.timestamp || isoNow(now),
    type: partial.type || 'unclassified',
    title: partial.title || '(untitled change)',
    summary: partial.summary || '',
    files: partial.files || [],
    commands: partial.commands || [],
    related: { commit: null, pr: null, workItem: null, ...(partial.related || {}) },
    author: partial.author || author || { model: null, user: null },
    sessionId: partial.sessionId || sessionId || null,
    status: partial.status || 'done',
    tags: partial.tags || [],
  };
}

/** Build a mechanical `unclassified` entry from staged facts (safety net). */
export function entryFromFacts(facts, opts = {}) {
  const changeFacts = facts.filter((f) => !f.linkage);
  const files = [...new Set(changeFacts.filter((f) => f.file).map((f) => f.file))];
  const commands = [...new Set(changeFacts.filter((f) => f.command).map((f) => f.command))];
  const title =
    files.length > 0
      ? `Changes to ${files.slice(0, 3).join(', ')}${files.length > 3 ? `, +${files.length - 3} more` : ''}`
      : commands.length > 0
        ? `Ran ${commands.length} command(s)`
        : 'Unclassified change';
  return buildEntry(
    {
      type: 'unclassified',
      title,
      summary: 'Auto-captured by the safety net; no semantic summary was written.',
      files,
      commands,
    },
    opts,
  );
}

/** Link recent unlinked entries of a session with a commit sha and/or PR url. */
export function backfillLinkage(entries, { sessionId, commit, pr }) {
  return entries.map((e) => {
    if (e.sessionId !== sessionId) return e;
    const related = { ...e.related };
    let changed = false;
    if (commit && !related.commit) {
      related.commit = commit;
      changed = true;
    }
    if (pr && !related.pr) {
      related.pr = pr;
      changed = true;
    }
    return changed ? { ...e, related } : e;
  });
}

/** Render entries to Markdown, grouped by date, newest last. */
export function renderMarkdown(entries) {
  const lines = [
    '# Journal',
    '',
    '> Generated by journal-logger from `.devkit/journal/entries.jsonl`. Do not edit by hand.',
    '',
  ];
  let lastDate = null;
  for (const e of entries) {
    const date = (e.timestamp || '').slice(0, 10);
    if (date !== lastDate) {
      lines.push(`## ${date}`, '');
      lastDate = date;
    }
    lines.push(`### [${e.type}] ${e.title}`);
    if (e.summary) lines.push(e.summary);
    if (e.files && e.files.length) lines.push(`- Files: ${e.files.join(', ')}`);
    if (e.commands && e.commands.length) lines.push(`- Commands: ${e.commands.join(' ; ')}`);
    const rel = e.related || {};
    const relParts = [];
    if (rel.commit) relParts.push(`commit ${rel.commit}`);
    if (rel.pr) relParts.push(`PR ${rel.pr}`);
    if (rel.workItem) relParts.push(`work item ${rel.workItem}`);
    if (relParts.length) lines.push(`- Related: ${relParts.join(', ')}`);
    const a = e.author || {};
    if (a.model || a.user) lines.push(`- By: ${a.model || 'unknown'}${a.user ? ` (${a.user})` : ''}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Compute a bounded digest for the SessionStart recap. */
export function buildDigest(entries, opts = {}) {
  const recent = opts.recent ?? DEFAULT_CONFIG.digest.recent;
  const windowDays = opts.windowDays ?? DEFAULT_CONFIG.digest.windowDays;
  const now = opts.now ? new Date(opts.now) : new Date();
  const cutoff = new Date(now.getTime() - windowDays * 86400000);
  const inWindow = entries.filter((e) => new Date(e.timestamp) >= cutoff);
  const counts = {};
  for (const e of inWindow) counts[e.type] = (counts[e.type] || 0) + 1;
  return {
    total: entries.length,
    windowDays,
    counts,
    recent: entries.slice(-recent),
    open: entries.filter((e) => e.status === 'open'),
  };
}

/** Render a digest object to text for injection into a new session. */
export function renderDigest(digest) {
  if (!digest.total) return 'journal-logger: no journal entries yet.';
  const countStr =
    Object.entries(digest.counts)
      .map(([t, n]) => `${n} ${t}`)
      .join(', ') || 'none';
  const lines = [
    `journal-logger recap — ${digest.total} entries total.`,
    `Last ${digest.windowDays} days: ${countStr}.`,
    '',
    'Recent entries:',
  ];
  for (const e of digest.recent) {
    lines.push(`- ${(e.timestamp || '').slice(0, 10)} [${e.type}] ${e.title}`);
  }
  if (digest.open.length) {
    lines.push('', 'Open threads:');
    for (const e of digest.open) lines.push(`- [${e.type}] ${e.title}`);
  }
  return lines.join('\n');
}

// ---- runtime-only helpers ----

function readJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function loadConfig(cwd) {
  try {
    return mergeConfig(JSON.parse(readFileSync(paths(cwd).config, 'utf8')));
  } catch {
    return DEFAULT_CONFIG;
  }
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function renderTo(cwd) {
  const p = paths(cwd);
  writeFileSync(p.markdown, renderMarkdown(readJsonl(p.entries)));
}

function appendEntry(cwd, entry) {
  const p = paths(cwd);
  ensureDir(p.journalDir);
  appendFileSync(p.entries, JSON.stringify(entry) + '\n');
  renderTo(cwd);
}

function clearStaging(cwd, sessionId) {
  const f = stagingFile(cwd, sessionId);
  if (existsSync(f)) rmSync(f);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) return resolve('');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 250);
  });
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function readPayload() {
  const raw = await readStdin();
  if (!raw) return {};
  try {
    return normalizePayload(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.render) {
    renderTo(process.cwd());
    return;
  }

  if (args.add) {
    const raw = await readStdin();
    let partial = {};
    try {
      partial = JSON.parse(raw);
    } catch {
      /* empty */
    }
    const cwd = partial.cwd || process.cwd();
    const entry = buildEntry(partial, { sessionId: args.session, author: partial.author });
    appendEntry(cwd, entry);
    if (args.session) clearStaging(cwd, args.session);
    process.stdout.write(`journal-logger: added entry ${entry.id}\n`);
    return;
  }

  if (args.flush) {
    if (args.session) clearStaging(process.cwd(), args.session);
    return;
  }

  if (args.link) {
    const cwd = process.cwd();
    const p = paths(cwd);
    const entries = backfillLinkage(readJsonl(p.entries), {
      sessionId: args.session,
      commit: args.commit || null,
      pr: args.pr || null,
    });
    writeFileSync(p.entries, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
    renderTo(cwd);
    return;
  }

  if (args['safety-net']) {
    const payload = await readPayload();
    const cwd = payload.cwd || process.cwd();
    const sessionId = payload.sessionId;
    const facts = readJsonl(stagingFile(cwd, sessionId));
    if (facts.filter((f) => !f.linkage).length > 0) {
      const entry = entryFromFacts(facts, { sessionId });
      appendEntry(cwd, entry);
    } else if (existsSync(paths(cwd).entries)) {
      renderTo(cwd); // keep JOURNAL.md in sync with entries Claude appended directly
    }
    clearStaging(cwd, sessionId);
    return;
  }

  if (args.digest) {
    const payload = await readPayload();
    const cwd = payload.cwd || process.cwd();
    const cfg = loadConfig(cwd);
    const entries = readJsonl(paths(cwd).entries);
    process.stdout.write(renderDigest(buildDigest(entries, cfg.digest)) + '\n');
    return;
  }
}

if (process.argv[1]?.endsWith('journal.mjs')) {
  main();
}
