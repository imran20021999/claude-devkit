---
name: journal-logger
description: Use right after completing a change to the codebase, a deployment, or infrastructure — a feature, enhancement, deprecation, bug fix, infra change, or deploy. Writes one journal entry per logical change into the repo's .devkit/journal/entries.jsonl so the history and intent survive across sessions. Not for read-only work or pure questions.
---

# Journal Logger

When you finish a logical change, record it in the repo's journal.

## When to run

After you complete a unit of work that changed something: a feature, enhancement, deprecation,
bugfix, infra change, or deploy. **Not** after read-only exploration, answering a question, or
running tests with no change.

## Step 1 — Find the staged facts (and the session id)

A `PostToolUse` hook has been recording what you touched into `.devkit/journal/.staging/`.
- The **most recently modified** `*.jsonl` file there is this session's staged facts.
- Its filename (without `.jsonl`) is the **sessionId** — use it in the entries.
- Read it for the exact files and commands changed. If the directory is empty or missing, fall back
  to your own memory of what you changed.

## Step 2 — Decide entry boundaries

**One logical change = one entry — not one per turn.**
- Many files serving one purpose → **one** entry (concise `summary`; list the files).
- Distinct or unrelated changes, or different change types → **separate** entries, each with its own
  correct `type`.
- Heuristics: different type → split; unrelated subject/module → split; same feature or fix across
  many files → keep together.

## Step 3 — Classify and write each entry

Pick one `type` per entry from the enabled set (default: `feature`, `enhancement`, `deprecation`,
`bugfix`, `infra`, `deploy`). Write a short `title` and a `summary` that captures the **why**, not
just the what.

Build each entry as a single-line JSON object matching this schema:

```json
{"id":"<ISO8601>-<4hex>","timestamp":"<ISO8601>","type":"bugfix","title":"...","summary":"why","files":["..."],"commands":[],"related":{"commit":null,"pr":null,"workItem":null},"author":{"model":"<your model>","user":"<user>"},"sessionId":"<from step 1>","status":"done","tags":[]}
```

- `timestamp`: current UTC time, e.g. `2026-11-14T10:32:05Z`.
- `files` / `commands`: from the staged facts (file contents are never logged — paths only).
- Leave `related.commit` / `related.pr` null; the hook backfills them when you commit / open a PR.

## Step 4 — Append and clean up

1. Append each entry as its own line to `.devkit/journal/entries.jsonl` (create the file/dir if
   missing). Append only — never rewrite existing lines.
2. **Delete the staging file you consumed** (from step 1), so the `Stop` safety-net does not also
   write a duplicate `unclassified` entry for the same work.
3. `JOURNAL.md` regenerates automatically (the `Stop` hook re-renders it from `entries.jsonl`).

## Guardrails

- Never put file contents, secrets, tokens, or credentials in an entry — paths and short summaries
  only.
- Keep `summary` to one or two sentences. The journal is a history, not a diff.
