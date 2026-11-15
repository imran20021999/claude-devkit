#!/usr/bin/env node
/**
 * review-context: deterministic inputs for /quality-review.
 *
 * Gathers the changed files, detects the base branch (never hardcodes `main`), and flags whether
 * the change touched tests. Prints a JSON context object. Pure helpers are exported for testing.
 *
 * Usage: node review-context.mjs [--base <branch>]
 */

import { spawnSync } from 'node:child_process';

export function normalizePath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Heuristic: does this path look like a test file? */
export function isTestFile(path) {
  const p = normalizePath(path).toLowerCase();
  return (
    /(^|\/)tests?\//.test(p) ||
    /(^|\/)__tests__\//.test(p) ||
    /\.(test|spec)\.[a-z0-9]+$/.test(p) ||
    /_test\.[a-z0-9]+$/.test(p) ||
    /(^|\/)test_[^/]+\.[a-z0-9]+$/.test(p)
  );
}

/** Parse `git diff --name-only` output into a normalized file list. */
export function parseChangedFiles(diffNameOnly) {
  return String(diffNameOnly)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizePath);
}

/**
 * Parse a base branch from a `git symbolic-ref` / `rev-parse origin/HEAD` result.
 * Never assumes `main`/`master`.
 */
export function parseBaseBranch(refOutput) {
  const s = String(refOutput).trim();
  if (!s) return null;
  const m = s.match(/(?:refs\/remotes\/)?origin\/(.+)$/);
  if (m) return m[1];
  return s || null;
}

/** Summarize a changed-file list for the review. */
export function summarize(files) {
  const changed = [...new Set(files.map(normalizePath))];
  const testFiles = changed.filter(isTestFile);
  const nonTest = changed.filter((f) => !isTestFile(f));
  return {
    changedFiles: changed,
    testFiles,
    testsTouched: testFiles.length > 0,
    // code changed but no test was added/updated alongside it
    codeWithoutTests: nonTest.length > 0 && testFiles.length === 0,
  };
}

// ---- runtime-only ----

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}

function detectBaseBranch() {
  // Prefer the remote's default branch; never hardcode main/master.
  const sym = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  const base = parseBaseBranch(sym || git(['rev-parse', '--abbrev-ref', 'origin/HEAD']));
  return base;
}

function main() {
  const args = process.argv.slice(2);
  const baseIdx = args.indexOf('--base');
  const base = baseIdx >= 0 ? args[baseIdx + 1] : detectBaseBranch();

  const files = parseChangedFiles(
    [
      git(['diff', '--name-only']), // unstaged modifications
      git(['diff', '--cached', '--name-only']), // staged
      git(['ls-files', '--others', '--exclude-standard']), // untracked new files
    ].join('\n'),
  );
  const context = { baseBranch: base || null, ...summarize(files) };
  process.stdout.write(JSON.stringify(context, null, 2) + '\n');
}

if (process.argv[1]?.endsWith('review-context.mjs')) {
  main();
}
