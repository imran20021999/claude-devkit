#!/usr/bin/env node
/**
 * PostToolUse hook: stage the facts of a change, and trigger commit/PR linkage.
 *
 * Reads a PostToolUse payload (JSON) from stdin. Change facts (edits, watched ops commands) are
 * appended to the session's staging buffer. Linkage signals (git commit / push, gh pr create)
 * trigger a backfill via `journal.mjs --link`. Thin runtime wrapper over tested helpers.
 */

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  extractFacts,
  mergeConfig,
  DEFAULT_CONFIG,
  paths,
  stagingFile,
  parsePrUrl,
  normalizePayload,
} from './journal.mjs';

const JOURNAL = new URL('./journal.mjs', import.meta.url).pathname;

function loadConfig(cwd) {
  try {
    return mergeConfig(JSON.parse(readFileSync(paths(cwd).config, 'utf8')));
  } catch {
    return DEFAULT_CONFIG;
  }
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

function stageFact(cwd, sessionId, fact) {
  const file = stagingFile(cwd, sessionId);
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(fact) + '\n');
}

function link(cwd, sessionId, kind, value) {
  const arg = kind === 'pr' ? '--pr' : '--commit';
  spawnSync(process.execPath, [JOURNAL, '--link', '--session', sessionId, arg, value], {
    cwd,
    stdio: 'ignore',
  });
}

function gitHead(cwd) {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

async function main() {
  const raw = await readStdin();
  if (!raw) process.exit(0);
  let payload;
  try {
    payload = normalizePayload(JSON.parse(raw));
  } catch {
    process.exit(0);
  }
  const cwd = payload.cwd || process.cwd();
  const sessionId = payload.sessionId || 'unknown';
  // Only journal real projects, not arbitrary scratch directories.
  if (!existsSync(join(cwd, '.git')) && !existsSync(join(cwd, '.devkit'))) process.exit(0);
  const config = loadConfig(cwd);

  const facts = extractFacts({ tool_name: payload.tool, tool_input: payload.input }, config);
  for (const fact of facts) {
    if (fact.linkage) {
      if (!sessionId || sessionId === 'unknown') continue;
      if (fact.linkage === 'pr') {
        const url = parsePrUrl(payload.output);
        if (url) link(cwd, sessionId, 'pr', url);
      } else {
        const sha = gitHead(cwd);
        if (sha) link(cwd, sessionId, 'commit', sha);
      }
    } else {
      stageFact(cwd, sessionId, fact);
    }
  }
  process.exit(0);
}

if (process.argv[1]?.endsWith('stage.mjs')) {
  main();
}
