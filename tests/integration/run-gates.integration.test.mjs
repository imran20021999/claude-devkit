import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(here, '..', '..', 'plugins', 'code-quality', 'hooks', 'run-gates.mjs');
const FIXTURE = join(here, '..', 'fixtures', 'sample');

function runCli(args) {
  return spawnSync(process.execPath, [RUNNER, ...args], {
    cwd: FIXTURE,
    encoding: 'utf8',
  });
}

test('blocking gate failure exits 2 and reports the gate', () => {
  const r = runCli(['src/bad.py']);
  assert.equal(r.status, 2);
  const out = r.stdout + r.stderr;
  assert.match(out, /py-lint/);
  assert.match(out, /BANNED/);
});

test('passing file exits 0', () => {
  const r = runCli(['src/good.ts']);
  assert.equal(r.status, 0);
});

test('non-blocking gate failure still exits 0', () => {
  const r = runCli(['src/bad.ts']);
  assert.equal(r.status, 0);
  const out = r.stdout + r.stderr;
  assert.match(out, /ts-lint/);
});

test('a file matching no gate exits 0', () => {
  const r = runCli(['README.md']);
  assert.equal(r.status, 0);
});

test('hook-style stdin payload runs the gate for the edited file', () => {
  const payload = JSON.stringify({
    cwd: FIXTURE,
    tool_input: { file_path: join(FIXTURE, 'src', 'bad.py') },
  });
  const r = spawnSync(process.execPath, [RUNNER], {
    cwd: FIXTURE,
    input: payload,
    encoding: 'utf8',
  });
  assert.equal(r.status, 2);
  assert.match(r.stdout + r.stderr, /py-lint/);
});
