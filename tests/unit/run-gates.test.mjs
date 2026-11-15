import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  globToRegExp,
  matchFile,
  selectGates,
  buildCommand,
  runGates,
  normalizePath,
  evaluateMaxLines,
} from '../../plugins/code-quality/hooks/run-gates.mjs';

test('normalizePath converts backslashes and strips leading ./', () => {
  assert.equal(normalizePath('src\\a.py'), 'src/a.py');
  assert.equal(normalizePath('./src/a.py'), 'src/a.py');
  assert.equal(normalizePath('a.py'), 'a.py');
});

test('globToRegExp: **/*.py matches nested and root py files only', () => {
  const re = globToRegExp('**/*.py');
  assert.ok(re.test('a.py'));
  assert.ok(re.test('src/a.py'));
  assert.ok(re.test('a/b/c.py'));
  assert.ok(!re.test('a.ts'));
  assert.ok(!re.test('src/a.pyc'));
});

test('globToRegExp: brace expansion {ts,tsx}', () => {
  const re = globToRegExp('**/*.{ts,tsx}');
  assert.ok(re.test('a.ts'));
  assert.ok(re.test('comp/b.tsx'));
  assert.ok(!re.test('a.js'));
  assert.ok(!re.test('a.tsxx'));
});

test('globToRegExp: single-segment *.py does not cross directories', () => {
  const re = globToRegExp('*.py');
  assert.ok(re.test('a.py'));
  assert.ok(!re.test('src/a.py'));
});

test('matchFile normalizes windows paths before matching', () => {
  assert.ok(matchFile('**/*.py', 'src\\pkg\\mod.py'));
  assert.ok(!matchFile('**/*.ts', 'src\\pkg\\mod.py'));
});

test('selectGates returns only gates with matches and the matched subset', () => {
  const gates = [
    { name: 'ruff', files: '**/*.py', command: 'ruff check {files}', blocking: true },
    { name: 'eslint', files: '**/*.{ts,tsx}', command: 'eslint {files}', blocking: false },
  ];
  const files = ['src/a.py', 'src/b.ts', 'README.md'];
  const selected = selectGates(gates, files);
  assert.equal(selected.length, 2);
  const ruff = selected.find((s) => s.gate.name === 'ruff');
  const eslint = selected.find((s) => s.gate.name === 'eslint');
  assert.deepEqual(ruff.matched, ['src/a.py']);
  assert.deepEqual(eslint.matched, ['src/b.ts']);
});

test('selectGates drops gates with no matching files', () => {
  const gates = [{ name: 'ruff', files: '**/*.py', command: 'ruff {files}', blocking: true }];
  assert.deepEqual(selectGates(gates, ['a.ts', 'b.md']), []);
});

test('buildCommand substitutes {files}', () => {
  assert.equal(buildCommand('ruff check {files}', ['a.py', 'b.py']), 'ruff check a.py b.py');
});

test('buildCommand appends files when no placeholder present', () => {
  assert.equal(buildCommand('ruff check', ['a.py']), 'ruff check a.py');
});

test('buildCommand quotes files containing spaces', () => {
  assert.equal(buildCommand('lint {files}', ['my file.py']), 'lint "my file.py"');
});

test('runGates: blocking gate failure sets blockingFailed', async () => {
  const config = {
    gates: [{ name: 'ruff', files: '**/*.py', command: 'ruff {files}', blocking: true }],
  };
  const exec = async () => ({ code: 1, stdout: 'E501 line too long', stderr: '' });
  const { results, blockingFailed } = await runGates({ config, files: ['a.py'], exec });
  assert.equal(blockingFailed, true);
  assert.equal(results.length, 1);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].blocking, true);
});

test('runGates: non-blocking failure records result but does not block', async () => {
  const config = {
    gates: [{ name: 'eslint', files: '**/*.ts', command: 'eslint {files}', blocking: false }],
  };
  const exec = async () => ({ code: 1, stdout: 'warning', stderr: '' });
  const { results, blockingFailed } = await runGates({ config, files: ['a.ts'], exec });
  assert.equal(blockingFailed, false);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].blocking, false);
});

test('runGates: passing gate is ok', async () => {
  const config = {
    gates: [{ name: 'ruff', files: '**/*.py', command: 'ruff {files}', blocking: true }],
  };
  const exec = async () => ({ code: 0, stdout: '', stderr: '' });
  const { results, blockingFailed } = await runGates({ config, files: ['a.py'], exec });
  assert.equal(blockingFailed, false);
  assert.equal(results[0].ok, true);
});

test('evaluateMaxLines flags files over the limit', () => {
  const r = evaluateMaxLines([{ file: 'a.py', lines: 600 }, { file: 'b.py', lines: 100 }], { limit: 500 });
  assert.equal(r.ok, false);
  assert.equal(r.offenders.length, 1);
  assert.equal(r.offenders[0].file, 'a.py');
  assert.equal(r.blocking, false);
  assert.match(r.output, /a\.py: 600 lines/);
});

test('evaluateMaxLines is ok when all files are under the limit', () => {
  const r = evaluateMaxLines([{ file: 'a.py', lines: 100 }], { limit: 500 });
  assert.equal(r.ok, true);
  assert.equal(r.offenders.length, 0);
});

test('evaluateMaxLines respects the files glob', () => {
  const r = evaluateMaxLines([{ file: 'a.md', lines: 999 }], { limit: 500, files: '**/*.py' });
  assert.equal(r.ok, true); // .md not matched
});

test('evaluateMaxLines honors the blocking flag', () => {
  const r = evaluateMaxLines([{ file: 'a.py', lines: 600 }], { limit: 500, blocking: true });
  assert.equal(r.blocking, true);
});

test('runGates: only matched files are passed to the command', async () => {
  const config = {
    gates: [{ name: 'ruff', files: '**/*.py', command: 'ruff {files}', blocking: true }],
  };
  let seen = null;
  const exec = async (cmd) => {
    seen = cmd;
    return { code: 0, stdout: '', stderr: '' };
  };
  await runGates({ config, files: ['a.py', 'b.ts'], exec });
  assert.equal(seen, 'ruff a.py');
});
