import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeConfig,
  DEFAULT_CONFIG,
  normalizeFile,
  isoNow,
  generateId,
  redactCommand,
  matchesAny,
  detectLinkage,
  parsePrUrl,
  normalizePayload,
  extractFacts,
  buildEntry,
  entryFromFacts,
  backfillLinkage,
  renderMarkdown,
  buildDigest,
  renderDigest,
} from '../../plugins/journal-logger/hooks/journal.mjs';

test('mergeConfig returns defaults for empty input and merges overrides', () => {
  assert.deepEqual(mergeConfig(null), DEFAULT_CONFIG);
  const merged = mergeConfig({ digest: { recent: 5 } });
  assert.equal(merged.digest.recent, 5);
  assert.equal(merged.digest.windowDays, DEFAULT_CONFIG.digest.windowDays);
  assert.deepEqual(merged.types, DEFAULT_CONFIG.types);
});

test('normalizeFile and isoNow', () => {
  assert.equal(normalizeFile('src\\a.py'), 'src/a.py');
  assert.equal(normalizeFile('./x.ts'), 'x.ts');
  assert.equal(isoNow(new Date('2026-11-14T10:32:05.123Z')), '2026-11-14T10:32:05Z');
});

test('generateId format', () => {
  const id = generateId(new Date('2026-11-14T10:32:05.123Z'), () => 'a1b2');
  assert.equal(id, '2026-11-14T10:32:05Z-a1b2');
});

test('redactCommand hides secret values and truncates', () => {
  assert.equal(redactCommand('deploy --token=abcd1234 --env=prod', ['TOKEN']), 'deploy --token=[REDACTED] --env=prod');
  assert.equal(redactCommand('run API_KEY=xyz', ['API_KEY']), 'run API_KEY=[REDACTED]');
  const long = redactCommand('x'.repeat(300), [], 50);
  assert.equal(long.length, 51);
  assert.ok(long.endsWith('…'));
});

test('matchesAny substring match', () => {
  assert.ok(matchesAny('kubectl apply', ['helm', 'kubectl']));
  assert.ok(!matchesAny('ls -la', ['kubectl', 'docker']));
});

test('detectLinkage recognizes git/gh signals', () => {
  assert.equal(detectLinkage('git commit -m "x"'), 'commit');
  assert.equal(detectLinkage('git push origin main'), 'push');
  assert.equal(detectLinkage('gh pr create --fill'), 'pr');
  assert.equal(detectLinkage('npm test'), null);
});

test('parsePrUrl extracts GitHub and Azure PR urls', () => {
  assert.equal(parsePrUrl('Created https://github.com/o/r/pull/42 ok'), 'https://github.com/o/r/pull/42');
  assert.equal(
    parsePrUrl('https://dev.azure.com/org/proj/_git/repo/pullrequest/7'),
    'https://dev.azure.com/org/proj/_git/repo/pullrequest/7',
  );
  assert.equal(parsePrUrl('no link here'), null);
});

test('normalizePayload handles naming variants', () => {
  const n = normalizePayload({ tool_name: 'Edit', tool_input: { file_path: 'a' }, session_id: 's', cwd: '/x' });
  assert.equal(n.tool, 'Edit');
  assert.equal(n.input.file_path, 'a');
  assert.equal(n.sessionId, 's');
  assert.equal(n.cwd, '/x');
});

test('extractFacts: edit produces a normalized file fact', () => {
  const facts = extractFacts({ tool_name: 'Edit', tool_input: { file_path: 'src\\a.py' } });
  assert.equal(facts.length, 1);
  assert.equal(facts[0].file, 'src/a.py');
  assert.equal(facts[0].tool, 'Edit');
});

test('extractFacts: watched bash produces an ops fact; unwatched produces none', () => {
  assert.deepEqual(extractFacts({ tool_name: 'Bash', tool_input: { command: 'ls -la' } }), []);
  const facts = extractFacts({ tool_name: 'Bash', tool_input: { command: 'kubectl apply -f x.yaml' } });
  assert.equal(facts.length, 1);
  assert.equal(facts[0].tag, 'ops');
});

test('extractFacts: git commit becomes a linkage fact', () => {
  const facts = extractFacts({ tool_name: 'Bash', tool_input: { command: 'git commit -m "x"' } });
  assert.equal(facts[0].linkage, 'commit');
});

test('extractFacts: ops command is redacted', () => {
  const facts = extractFacts({ tool_name: 'Bash', tool_input: { command: 'terraform apply -var token=SEKRET' } });
  assert.match(facts[0].command, /token=\[REDACTED\]/);
});

test('extractFacts: edits disabled suppresses edit facts', () => {
  const cfg = mergeConfig({ watch: { edits: false } });
  assert.deepEqual(extractFacts({ tool_name: 'Edit', tool_input: { file_path: 'a.py' } }, cfg), []);
});

test('buildEntry fills defaults and merges related', () => {
  const e = buildEntry({}, { id: 'X' });
  assert.equal(e.id, 'X');
  assert.equal(e.type, 'unclassified');
  assert.equal(e.status, 'done');
  assert.deepEqual(e.related, { commit: null, pr: null, workItem: null });

  const e2 = buildEntry({ type: 'bugfix', title: 't', related: { commit: 'abc' } });
  assert.equal(e2.type, 'bugfix');
  assert.equal(e2.related.commit, 'abc');
  assert.equal(e2.related.pr, null);
});

test('entryFromFacts dedups files, ignores linkage facts, marks unclassified', () => {
  const facts = [
    { file: 'a.py' },
    { file: 'a.py' },
    { file: 'b.py' },
    { linkage: 'commit', command: 'git commit -m x' },
  ];
  const e = entryFromFacts(facts, { id: 'X' });
  assert.equal(e.type, 'unclassified');
  assert.deepEqual(e.files, ['a.py', 'b.py']);
  assert.equal(e.commands.length, 0);
  assert.match(e.title, /a\.py/);
});

test('backfillLinkage links session entries without overwriting existing', () => {
  const entries = [
    { sessionId: 's1', related: { commit: null, pr: null } },
    { sessionId: 's2', related: { commit: null, pr: null } },
    { sessionId: 's1', related: { commit: 'old', pr: null } },
  ];
  const out = backfillLinkage(entries, { sessionId: 's1', commit: 'new', pr: 'url' });
  assert.equal(out[0].related.commit, 'new');
  assert.equal(out[0].related.pr, 'url');
  assert.equal(out[1].related.commit, null); // other session untouched
  assert.equal(out[2].related.commit, 'old'); // existing not overwritten
  assert.equal(out[2].related.pr, 'url');
});

test('renderMarkdown groups by date and includes fields', () => {
  const md = renderMarkdown([
    {
      timestamp: '2026-11-14T10:00:00Z',
      type: 'bugfix',
      title: 'Fix pagination',
      summary: 'off-by-one',
      files: ['a.py'],
      commands: [],
      related: { commit: 'abc', pr: null, workItem: null },
      author: { model: 'Opus', user: 'dany' },
    },
  ]);
  assert.match(md, /## 2026-11-14/);
  assert.match(md, /### \[bugfix\] Fix pagination/);
  assert.match(md, /off-by-one/);
  assert.match(md, /- Files: a\.py/);
  assert.match(md, /- Related: commit abc/);
  assert.match(md, /- By: Opus \(dany\)/);
});

test('buildDigest counts within window and slices recent', () => {
  const entries = [
    { timestamp: '2026-01-01T00:00:00Z', type: 'feature', title: 'old', status: 'done' },
    { timestamp: '2026-11-10T00:00:00Z', type: 'bugfix', title: 'recent', status: 'open' },
  ];
  const d = buildDigest(entries, { now: '2026-11-14T00:00:00Z', windowDays: 30, recent: 15 });
  assert.equal(d.total, 2);
  assert.equal(d.counts.bugfix, 1);
  assert.equal(d.counts.feature, undefined);
  assert.equal(d.recent.length, 2);
  assert.equal(d.open.length, 1);
});

test('renderDigest handles empty and populated journals', () => {
  assert.match(renderDigest(buildDigest([])), /no journal entries/);
  const d = buildDigest(
    [{ timestamp: '2026-11-10T00:00:00Z', type: 'bugfix', title: 'recent', status: 'done' }],
    { now: '2026-11-14T00:00:00Z' },
  );
  const out = renderDigest(d);
  assert.match(out, /recap/);
  assert.match(out, /recent/);
});
