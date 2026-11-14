# journal-logger

An always-on, per-project journal of every change Claude makes to a repo — code, deploy, and infra — with cross-session, cross-machine recall.

## What it does

- **Captures automatically.** A `PostToolUse` hook stages the facts of every edit (and watched deploy/infra command) as you work — nothing to remember.
- **Writes meaningful entries.** When a task completes, Claude classifies the change (feature / enhancement / deprecation / bugfix / infra / deploy) and writes *why*, following the `journal-logger` skill.
- **Never loses a change.** A `Stop` hook auto-writes a mechanical `unclassified` entry if a turn ends with unlogged work.
- **Recaps on a new session.** A `SessionStart` hook injects a bounded digest so a fresh session (even on another laptop) picks up the history.

## Output (in your repo, committed)

```
JOURNAL.md                      # human-readable, regenerated
.devkit/journal/entries.jsonl   # source of truth
.devkit/journal/journal.json    # optional config (overrides only)
.devkit/journal/.staging/       # transient, git-ignored
```

## Commands

- `/journal <description>` — add an entry by hand.
- `/journal link <commit|pr-url>` — attach a commit/PR reference to recent entries.
- `/journal-recap [query]` — summarize the journal, optionally filtered.

## Config (optional, `.devkit/journal.json`)

Zero-config by default. Override only what you need: `types`, `watch.bashPatterns`, `digest`, `redact`.

## Requirements

- Node.js. No other dependencies.
