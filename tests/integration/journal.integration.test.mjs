import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const HOOKS = join(here, '..', '..', 'plugins', 'journal-logger', 'hooks');
const STAGE = join(HOOKS, 'stage.mjs');
const JOURNAL = join(HOOKS, 'journal.mjs');

function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), 'jl-'));
  mkdirSync(join(dir, '.devkit', 'journal'), { recursive: true });
  return dir;
}
function run(script, args, { cwd, input } = {}) {
  return spawnSync(process.execPath, [script, ...args], { cwd, input, encoding: 'utf8' });
}
function entriesOf(dir) {
  const f = join(dir, '.devkit', 'journal', 'entries.jsonl');
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}
function stagingPath(dir, session) {
  return join(dir, '.devkit', 'journal', '.staging', `${session}.jsonl`);
}
function editPayload(dir, file, session) {
  return JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: join(dir, file) }, session_id: session, cwd: dir });
}

test('stage.mjs stages an edit fact', () => {
  const dir = makeProject();
  const r = run(STAGE, [], { cwd: dir, input: editPayload(dir, 'src/a.py', 'sess1') });
  assert.equal(r.status, 0);
  assert.ok(existsSync(stagingPath(dir, 'sess1')));
  const facts = readFileSync(stagingPath(dir, 'sess1'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(facts[0].file.endsWith('a.py'));
  rmSync(dir, { recursive: true, force: true });
});

test('stage.mjs skips non-project directories', () => {
  const dir = mkdtempSync(join(tmpdir(), 'jl-bare-')); // no .git, no .devkit
  run(STAGE, [], { cwd: dir, input: editPayload(dir, 'a.py', 's') });
  assert.ok(!existsSync(join(dir, '.devkit')));
  rmSync(dir, { recursive: true, force: true });
});

test('safety-net writes an unclassified entry from staged facts and clears staging', () => {
  const dir = makeProject();
  run(STAGE, [], { cwd: dir, input: editPayload(dir, 'a.py', 'sess2') });
  run(STAGE, [], { cwd: dir, input: editPayload(dir, 'b.py', 'sess2') });
  const r = run(JOURNAL, ['--safety-net'], { cwd: dir, input: JSON.stringify({ session_id: 'sess2', cwd: dir }) });
  assert.equal(r.status, 0);
  const entries = entriesOf(dir);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'unclassified');
  assert.equal(entries[0].files.length, 2);
  assert.ok(!existsSync(stagingPath(dir, 'sess2')));
  assert.ok(existsSync(join(dir, 'JOURNAL.md')));
  rmSync(dir, { recursive: true, force: true });
});

test('safety-net with no staged facts writes nothing', () => {
  const dir = makeProject();
  const r = run(JOURNAL, ['--safety-net'], { cwd: dir, input: JSON.stringify({ session_id: 'none', cwd: dir }) });
  assert.equal(r.status, 0);
  assert.equal(entriesOf(dir).length, 0);
  rmSync(dir, { recursive: true, force: true });
});

test('--add appends a classified entry and clears session staging', () => {
  const dir = makeProject();
  run(STAGE, [], { cwd: dir, input: editPayload(dir, 'x.py', 'sessX') });
  const entry = JSON.stringify({
    cwd: dir,
    type: 'bugfix',
    title: 'Fix x',
    summary: 'why',
    files: ['x.py'],
    sessionId: 'sessX',
    author: { model: 'Opus', user: 'dany' },
  });
  const r = run(JOURNAL, ['--add', '--session', 'sessX'], { cwd: dir, input: entry });
  assert.equal(r.status, 0);
  const entries = entriesOf(dir);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].type, 'bugfix');
  assert.ok(!existsSync(stagingPath(dir, 'sessX')));
  rmSync(dir, { recursive: true, force: true });
});

test('--link backfills a commit onto session entries', () => {
  const dir = makeProject();
  run(JOURNAL, ['--add'], {
    cwd: dir,
    input: JSON.stringify({ cwd: dir, type: 'feature', title: 'F', sessionId: 'sL', author: { model: 'Opus' } }),
  });
  const r = run(JOURNAL, ['--link', '--session', 'sL', '--commit', 'abc123'], { cwd: dir });
  assert.equal(r.status, 0);
  assert.equal(entriesOf(dir)[0].related.commit, 'abc123');
  rmSync(dir, { recursive: true, force: true });
});

test('--digest prints a recap including recent titles', () => {
  const dir = makeProject();
  run(JOURNAL, ['--add'], {
    cwd: dir,
    input: JSON.stringify({ cwd: dir, type: 'feature', title: 'F1', sessionId: 'sD' }),
  });
  const r = run(JOURNAL, ['--digest'], { cwd: dir, input: JSON.stringify({ cwd: dir }) });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /recap/);
  assert.match(r.stdout, /F1/);
  rmSync(dir, { recursive: true, force: true });
});

test('stage.mjs does not stage a git-commit linkage as a change fact', () => {
  const dir = makeProject();
  const r = run(STAGE, [], {
    cwd: dir,
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -m "x"' }, session_id: 'sG', cwd: dir }),
  });
  assert.equal(r.status, 0);
  assert.ok(!existsSync(stagingPath(dir, 'sG')));
  rmSync(dir, { recursive: true, force: true });
});
