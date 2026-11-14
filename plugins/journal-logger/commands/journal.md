---
description: Add a journal entry by hand, or link a commit/PR to recent entries.
argument-hint: "<description> | link <commit|pr-url>"
---

Arguments: `$ARGUMENTS`

**If the arguments start with `link`:** attach a reference to this session's recent entries. Run:
```
node "${CLAUDE_PLUGIN_ROOT}/hooks/journal.mjs" --link --session "<sessionId>" --commit "<sha>"
```
(use `--pr "<url>"` for a PR link). Find `<sessionId>` from the most recently modified file in
`.devkit/journal/.staging/`, or from a recent entry.

**Otherwise:** treat the arguments as the description of a change to log manually. Follow the
`journal-logger` skill to build one entry (classify the type, write the why) and append it to
`.devkit/journal/entries.jsonl`. This is for decisions or changes that weren't captured
automatically. Then report the entry you added.
