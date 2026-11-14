---
description: Summarize the project journal — recent changes and history — optionally filtered by a query.
argument-hint: "[query | since <date>]"
---

Summarize this repo's journal from `.devkit/journal/entries.jsonl`.

Filter: `$ARGUMENTS`
- No filter → give the recent digest: counts by type over the last 30 days, then the most recent
  entries, and any `status: open` threads. You can run
  `node "${CLAUDE_PLUGIN_ROOT}/hooks/journal.mjs" --digest` for the bounded digest.
- A query (e.g. a module, a type like `deprecation`, or `since 2026-11-01`) → read `entries.jsonl`
  and report the matching entries (match on `type`, `tags`, `files`, `title`, `summary`, or
  `timestamp`), most recent first.

Keep it concise: titles, types, dates, and the key "why"s — not a dump of every field.
