import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseConventionalCommit,
  checkCommitMessages,
  detectLinkedIssue,
  checkPrHygiene,
  detectBreaking,
  checkBreakingChange,
  isDocFile,
  isCodeFile,
  checkDocsUpdated,
  parseTemplateSections,
  checkTemplateAdherence,
} from '../../plugins/code-quality/hooks/pr-context.mjs';

test('parseConventionalCommit accepts valid forms', () => {
  assert.equal(parseConventionalCommit('feat: add login').valid, true);
  const scoped = parseConventionalCommit('fix(api): handle null');
  assert.equal(scoped.valid, true);
  assert.equal(scoped.scope, 'api');
  const breaking = parseConventionalCommit('feat!: drop v1');
  assert.equal(breaking.breaking, true);
  assert.equal(parseConventionalCommit('Feat: capitalized type').valid, true); // case-insensitive type
});

test('parseConventionalCommit rejects invalid forms', () => {
  assert.equal(parseConventionalCommit('just a message').valid, false);
  assert.equal(parseConventionalCommit('wip: not a real type').valid, false);
  assert.equal(parseConventionalCommit('feat:no space').valid, false);
});

test('checkCommitMessages maps each subject', () => {
  const r = checkCommitMessages(['feat: a', 'oops']);
  assert.equal(r.length, 2);
  assert.equal(r[0].valid, true);
  assert.equal(r[1].valid, false);
});

test('detectLinkedIssue finds references', () => {
  assert.equal(detectLinkedIssue('closes #123'), 'closes #123');
  assert.equal(detectLinkedIssue('see #42 for details'), '#42');
  assert.equal(detectLinkedIssue('https://github.com/o/r/issues/7'), '/issues/7');
  assert.equal(detectLinkedIssue('no reference here'), null);
});

test('checkPrHygiene flags empty title and body', () => {
  const r = checkPrHygiene({ title: '', body: '' });
  assert.equal(r.ok, false);
  assert.ok(r.findings.some((f) => f.field === 'title'));
  assert.ok(r.findings.some((f) => f.field === 'body'));
});

test('checkPrHygiene passes a well-formed PR', () => {
  const r = checkPrHygiene({
    title: 'feat: add pagination to orders',
    body: 'Adds cursor-based pagination to the orders endpoint. Closes #88.',
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.findings, []);
});

test('checkPrHygiene requires a typed (Conventional Commit) title', () => {
  const r = checkPrHygiene({
    title: 'add pagination to orders',
    body: 'A sufficiently long description that clearly explains the change being made here.',
  });
  assert.ok(r.findings.some((f) => f.field === 'title' && f.severity === 'major'));
});

test('checkPrHygiene flags a short description and missing issue', () => {
  const r = checkPrHygiene({ title: 'feat: x', body: 'tiny' });
  assert.ok(r.findings.some((f) => f.field === 'body' && f.severity === 'minor'));
  assert.ok(r.findings.some((f) => f.field === 'issue'));
});

test('detectBreaking recognizes ! type and BREAKING CHANGE footer', () => {
  assert.equal(detectBreaking({ title: 'feat!: drop v1' }).breaking, true);
  assert.equal(detectBreaking({ commitSubjects: ['fix(api)!: change shape'] }).byBang, true);
  assert.equal(detectBreaking({ body: 'Notes\n\nBREAKING CHANGE: removes the old API' }).byFooter, true);
  assert.equal(detectBreaking({ title: 'feat: safe addition' }).breaking, false);
});

test('checkBreakingChange requires an explanation when breaking', () => {
  const unexplained = checkBreakingChange({ title: 'feat!: drop v1', body: 'adds stuff' });
  assert.equal(unexplained.breaking, true);
  assert.ok(unexplained.findings.some((f) => f.field === 'breaking' && f.severity === 'major'));

  const explained = checkBreakingChange({ title: 'feat!: drop v1', body: 'BREAKING CHANGE: v1 removed; migrate to v2.' });
  assert.deepEqual(explained.findings, []);

  assert.deepEqual(checkBreakingChange({ title: 'feat: x', body: 'y' }).findings, []);
});

test('isDocFile / isCodeFile classification', () => {
  assert.ok(isDocFile('README.md'));
  assert.ok(isDocFile('docs/guide.md'));
  assert.ok(isDocFile('CHANGELOG'));
  assert.ok(!isDocFile('src/a.ts'));
  assert.ok(isCodeFile('src/a.ts'));
  assert.ok(isCodeFile('pkg/main.go'));
  assert.ok(!isCodeFile('README.md'));
});

test('checkDocsUpdated flags code changed without docs', () => {
  const r = checkDocsUpdated(['src/a.ts', 'src/b.ts']);
  assert.equal(r.needsDocs, true);
  assert.ok(r.findings.some((f) => f.field === 'docs'));
  const ok = checkDocsUpdated(['src/a.ts', 'README.md']);
  assert.equal(ok.needsDocs, false);
  assert.deepEqual(ok.findings, []);
});

test('parseTemplateSections extracts headings', () => {
  const t = '## What & why\nblah\n## Testing\n- x\n### Related\n';
  assert.deepEqual(parseTemplateSections(t), ['What & why', 'Testing', 'Related']);
});

test('checkTemplateAdherence flags missing sections and leftover placeholders', () => {
  const template = '## What & why\n## Testing\n## Related\n';
  const body = '## What & why\nDid things.\n<!-- TODO -->';
  const r = checkTemplateAdherence(body, template);
  assert.equal(r.hasTemplate, true);
  assert.ok(r.findings.some((f) => f.field === 'template' && /missing/.test(f.message)));
  assert.ok(r.findings.some((f) => /placeholder/.test(f.message)));
  assert.deepEqual(checkTemplateAdherence('anything', null).findings, []);
});
