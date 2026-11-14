// A tiny, dependency-free stand-in for a real linter, used by fixtures/integration tests.
// Exits non-zero if any given file contains the token "BANNED".
import { readFileSync } from 'node:fs';

let failed = false;
for (const file of process.argv.slice(2)) {
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const idx = text.split('\n').findIndex((l) => l.includes('BANNED'));
  if (idx >= 0) {
    console.log(`${file}:${idx + 1}: found BANNED token`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
