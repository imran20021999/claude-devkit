import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePath,
  isTestFile,
  parseChangedFiles,
  parseBaseBranch,
  summarize,
} from '../../plugins/code-quality/hooks/review-context.mjs';

test('normalizePath', () => {
  assert.equal(normalizePath('src\\a.py'), 'src/a.py');
  assert.equal(normalizePath('./a.ts'), 'a.ts');
});

test('isTestFile recognizes common test conventions', () => {
  assert.ok(isTestFile('src/foo.test.ts'));
  assert.ok(isTestFile('src/foo.spec.js'));
  assert.ok(isTestFile('pkg/foo_test.go'));
  assert.ok(isTestFile('tests/test_foo.py'));
  assert.ok(isTestFile('app/__tests__/foo.tsx'));
  assert.ok(isTestFile('tests/helpers.rb'));
  assert.ok(!isTestFile('src/foo.ts'));
  assert.ok(!isTestFile('src/contestant.ts')); // not a test despite "test" substring
});

test('parseChangedFiles normalizes and drops blanks', () => {
  assert.deepEqual(parseChangedFiles('src\\a.py\n\n  b.ts  \n'), ['src/a.py', 'b.ts']);
});

test('parseBaseBranch never assumes main', () => {
  assert.equal(parseBaseBranch('origin/main'), 'main');
  assert.equal(parseBaseBranch('refs/remotes/origin/develop'), 'develop');
  assert.equal(parseBaseBranch('origin/release/v2'), 'release/v2');
  assert.equal(parseBaseBranch('V6.0.0'), 'V6.0.0');
  assert.equal(parseBaseBranch(''), null);
});

test('summarize flags code changed without tests', () => {
  const s = summarize(['src/a.ts', 'src/b.ts']);
  assert.equal(s.testsTouched, false);
  assert.equal(s.codeWithoutTests, true);
  assert.deepEqual(s.testFiles, []);
});

test('summarize detects tests touched', () => {
  const s = summarize(['src/a.ts', 'src/a.test.ts']);
  assert.equal(s.testsTouched, true);
  assert.equal(s.codeWithoutTests, false);
  assert.deepEqual(s.testFiles, ['src/a.test.ts']);
});

test('summarize dedups files', () => {
  const s = summarize(['a.ts', 'a.ts', 'b.ts']);
  assert.deepEqual(s.changedFiles, ['a.ts', 'b.ts']);
});
