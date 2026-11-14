#!/usr/bin/env node
/**
 * code-quality gate runner.
 *
 * Two entry modes:
 *   1. CLI:  node run-gates.mjs <file> [<file> ...]   — run gates for the given files.
 *   2. Hook: no args — read a PostToolUse hook payload (JSON) from stdin and run gates
 *            for the edited file.
 *
 * Config is read from `.devkit/quality.json` in the working directory (or the hook's cwd).
 * The pure helpers below are exported for unit testing; nothing runs on import.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

/** Normalize a path for glob matching: backslashes -> slashes, strip a leading `./`. */
export function normalizePath(p) {
  return String(p).replace(/\\/g, '/').replace(/^\.\//, '');
}

const REGEX_META = /[.+^$()|[\]\\]/g;
function escapeLiteral(s) {
  return s.replace(REGEX_META, '\\$&');
}

/** Convert a glob (supporting **, *, ?, and {a,b,c}) to an anchored RegExp. */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?'; // '**/' — zero or more directory segments
          i += 2;
        } else {
          re += '.*'; // '**' — anything, including slashes
          i += 1;
        }
      } else {
        re += '[^/]*'; // '*' — anything but a slash
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      const close = glob.indexOf('}', i);
      if (close === -1) {
        re += '\\{';
      } else {
        const alts = glob
          .slice(i + 1, close)
          .split(',')
          .map(escapeLiteral)
          .join('|');
        re += '(?:' + alts + ')';
        i = close;
      }
    } else {
      re += escapeLiteral(c);
    }
  }
  return new RegExp('^' + re + '$');
}

/** True if `filePath` matches `glob` (after normalization). */
export function matchFile(glob, filePath) {
  return globToRegExp(glob).test(normalizePath(filePath));
}

/** Return [{ gate, matched }] for gates with at least one matching file. */
export function selectGates(gates, files) {
  const normalized = files.map(normalizePath);
  const out = [];
  for (const gate of gates) {
    const re = globToRegExp(gate.files);
    const matched = normalized.filter((f) => re.test(f));
    if (matched.length) out.push({ gate, matched });
  }
  return out;
}

function quoteIfNeeded(f) {
  return /\s/.test(f) ? `"${f}"` : f;
}

/** Build a shell command from a template, substituting `{files}` (or appending). */
export function buildCommand(template, files) {
  const joined = files.map(quoteIfNeeded).join(' ');
  if (template.includes('{files}')) return template.replaceAll('{files}', joined);
  return `${template} ${joined}`.trimEnd();
}

/**
 * Run the matching gates.
 * @param {{config: object, files: string[], exec: (cmd: string) => Promise<{code:number,stdout:string,stderr:string}>}} args
 * @returns {Promise<{results: Array, blockingFailed: boolean}>}
 */
export async function runGates({ config, files, exec }) {
  const selected = selectGates(config.gates || [], files);
  const results = [];
  let blockingFailed = false;
  for (const { gate, matched } of selected) {
    const command = buildCommand(gate.command, matched);
    const { code, stdout, stderr } = await exec(command);
    const ok = code === 0;
    if (!ok && gate.blocking) blockingFailed = true;
    results.push({
      name: gate.name,
      ok,
      blocking: Boolean(gate.blocking),
      command,
      output: `${stdout || ''}${stderr || ''}`.trim(),
    });
  }
  return { results, blockingFailed };
}

// ---- runtime-only helpers (not exercised by unit tests) ----

function loadConfig(cwd) {
  try {
    const raw = readFileSync(join(cwd, '.devkit', 'quality.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function shellExec(cwd) {
  return (command) =>
    new Promise((resolve) => {
      const child = spawn(command, {
        cwd,
        shell: true,
        windowsHide: true,
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
      child.on('error', (err) => resolve({ code: 1, stdout, stderr: String(err) }));
    });
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) return resolve('');
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 250); // don't hang if nothing arrives
  });
}

function report(results) {
  for (const r of results) {
    const status = r.ok ? 'pass' : r.blocking ? 'FAIL' : 'warn';
    const line = `[code-quality] ${status}: ${r.name}`;
    if (r.ok) {
      console.log(line);
    } else {
      const stream = r.blocking ? console.error : console.log;
      stream(line);
      if (r.output) stream(r.output);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  let files = [];
  let cwd = process.cwd();

  if (args.length > 0) {
    files = args;
  } else {
    const raw = await readStdin();
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        if (payload.cwd) cwd = payload.cwd;
        const fp = payload?.tool_input?.file_path;
        if (fp) files = [fp];
      } catch {
        // not a JSON hook payload; nothing to do
      }
    }
  }

  if (files.length === 0) process.exit(0);

  const config = loadConfig(cwd);
  if (!config || !Array.isArray(config.gates) || config.gates.length === 0) process.exit(0);

  const { results, blockingFailed } = await runGates({
    config,
    files,
    exec: shellExec(cwd),
  });
  report(results);
  process.exit(blockingFailed ? 2 : 0);
}

// Run only when invoked directly, never on import.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('run-gates.mjs')) {
  main();
}
