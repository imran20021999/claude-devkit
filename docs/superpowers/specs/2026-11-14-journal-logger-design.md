# claude-devkit — journal-logger plugin (Design)

- **Date:** 2026-11-14
- **Status:** Approved (design); implementation not started
- **Author:** dany@beakops.com
- **Scope:** A sibling plugin in the `claude-devkit` marketplace. An always-on, per-project journal of every change Claude makes to a repo — code, deploy, and infra — with cross-session/cross-machine recall.

## 1. Goal

Give every repo an automatic, committed record of *what changed, why, and when* — so the history and intent of the work survives across sessions, machines, and people. A new session on a different laptop can pick up the full context by reading the journal that travels with the repo.

The journal captures the layer git does not keep well: the **rationale** (feature intent, why a bug occurred, why infra was changed), not just the diff.

## 2. Decisions (settled during brainstorming)

- **Scope:** per-project — the journal lives inside the worked-on repo and is committed with it.
- **Granularity:** per logical task — one entry per unit of work, not per raw edit.
- **Authoring:** hybrid — a hook captures facts mechanically; Claude writes the semantic summary.
- **Storage:** both — `entries.jsonl` (source of truth) + a regenerated `JOURNAL.md` (human view).
- **Watched changes:** code edits always; deploy/infra Bash commands by configurable pattern.
- **Safety net:** if a turn ends with unflushed facts, the Stop hook auto-writes a mechanical `unclassified` entry so nothing is lost.
- **Recap:** a `SessionStart` hook injects a journal digest into new sessions; `/journal-recap` pulls it on demand.

## 3. Non-goals

- Not a replacement for git history or commit messages; it complements them.
- Not a global cross-project log (per-project only in this version).
- Does not auto-commit or push — the journal rides git like any other file; the user commits it.
- Does not log file contents or secrets (see Guardrails).

## 4. Architecture

### 4.1 Plugin layout

```
plugins/journal-logger/
├── .claude-plugin/plugin.json
├── skills/
│   └── journal-logger/SKILL.md     # classify + author an entry; flush staging
├── commands/
│   ├── journal.md                  # /journal        — manual entry / link
│   └── journal-recap.md            # /journal-recap   — on-demand recap / query
├── hooks/
│   ├── hooks.json                  # registers PostToolUse, Stop, SessionStart
│   ├── stage.mjs                   # PostToolUse: append raw facts to staging
│   └── journal.mjs                 # append entry | clear staging | render MD | Stop safety-net | SessionStart digest
└── README.md
```

### 4.2 Storage (in the worked-on repo)

```
<repo>/
├── JOURNAL.md                      # rendered human view (generated, committed)
└── .devkit/journal/
    ├── entries.jsonl               # source of truth, one JSON object per line (committed)
    ├── journal.json                # OPTIONAL config, overrides only (committed)
    └── .staging/                   # transient, git-ignored
        └── <sessionId>.jsonl       # raw facts buffered during a task
```

The plugin ensures `.devkit/journal/.staging/` is git-ignored (adds a rule if missing).

### 4.3 Entry schema

```json
{
  "id": "2026-11-14T10:32:05Z-a1b2",
  "timestamp": "2026-11-14T10:32:05Z",
  "type": "bugfix",
  "title": "Fix pagination off-by-one on /orders",
  "summary": "Last row dropped when total was an exact page multiple.",
  "files": ["src/api/orders.py", "tests/test_orders.py"],
  "commands": [],
  "related": { "commit": "a1b2c3d", "pr": null, "workItem": null },
  "author": { "model": "Claude Opus 4.8", "user": "dany" },
  "sessionId": "9f2e...",
  "status": "done",
  "tags": ["orders", "pagination"]
}
```

- `id` = timestamp + short suffix; append-only, newest last.
- `status` (optional) = `done` | `open`, to support "open threads" in the digest. Defaults to `done`.
- `JOURNAL.md` is this rendered, grouped by date, newest last.

### 4.4 Change types

**Core (default):** `feature`, `enhancement`, `deprecation`, `bugfix`, `infra`, `deploy`, `unclassified` (safety-net only).

**Optional (enable in `journal.json`):** `refactor`, `config`, `chore`, `docs`, `test`.

The enabled set is configurable so teams can align it with their own labels / Conventional Commits.

### 4.5 Config (`.devkit/journal.json`, optional)

Zero-config by default. Overrides only:

```jsonc
{
  "types": ["feature", "enhancement", "deprecation", "bugfix", "infra", "deploy"],
  "watch": {
    "edits": true,
    "bashPatterns": ["terraform", "kubectl", "helm", "docker", "docker-compose", "alembic", "migrate", "deploy"]
  },
  "digest": { "recent": 15, "windowDays": 30 },
  "redact": { "patterns": ["API_KEY", "SECRET", "TOKEN", "PASSWORD"], "maxArgLen": 200 }
}
```

## 5. Flow

### 5.1 Capture (automatic, every change)
`PostToolUse` → `stage.mjs`:
- On `Edit`/`Write`/`MultiEdit`: append `{ tool, file, timestamp }` to `.staging/<sessionId>.jsonl`.
- On `Bash` matching a configured pattern: append `{ tool: "Bash", command (redacted/truncated), timestamp, tag: "infra|deploy" }`.
- Mechanical, no reasoning, cannot be forgotten.

### 5.2 Author (semantic, per logical task)
Guided by the `journal-logger` skill, when a logical task completes Claude:
1. Reads the session's staged facts.
2. Classifies the change (one enabled type) and writes `title` + `summary` (the *why*).
3. Appends one or more entries to `entries.jsonl` via `journal.mjs`, clears that session's staging, re-renders `JOURNAL.md`.

**Entry boundaries — one logical change = one entry (not one per turn).** A single task may do
several things. Claude groups by coherent intent and type: many files serving one purpose become
**one** entry (the `summary` is concise prose; `files[]`/`commands[]` carry the detail), while
distinct or unrelated changes become **separate** entries so each keeps its own correct `type`.
Heuristics: different change type → split; unrelated subject/module → split; same feature or fix
across many files → keep together. So a single turn can yield multiple entries.

### 5.3 Safety net (never lose a change)
`Stop` → `journal.mjs --safety-net`:
- If the session's staging still has facts (Claude didn't author an entry), write a mechanical `unclassified` entry from the raw facts and clear staging. No reasoning, no loop risk.

### 5.4 Recap (cross-session / cross-machine)
`SessionStart` → `journal.mjs --digest`:
- Read `entries.jsonl`, emit a bounded digest as session context: the last `digest.recent` entries + a rollup over `digest.windowDays` (counts by type) + any `status: open` threads.
- Keeps context small; the full structured log stays queryable on demand.

`/journal-recap [query|since]`:
- On-demand: summarize the journal, optionally filtered (e.g. a module, a type, "since my last session").

### 5.5 Manual entry
`/journal <description>` — add an entry by hand for a decision or change Claude didn't make.
`/journal link <commit|pr-url>` — attach a commit/PR reference to recent entries manually.

### 5.6 Commit / PR linkage
Entries are usually written *before* the work is committed or a PR is opened, so `related` is filled
by **best-effort linkage**, not at author time:
- At author time, record the current branch and `git HEAD` sha if the change is already committed;
  otherwise leave `related.commit` null.
- The PostToolUse hook also watches git/PR signals — `git commit`, `git push`, `gh pr create` — and
  **backfills** `related.commit` / `related.pr` onto this session's recent unlinked entries (a PR URL
  is parsed from `gh pr create` output). These signals are used only for linkage; they are not
  themselves logged as entries.
- `/journal link <commit|pr-url>` attaches a reference manually when automation can't.

So: yes — once work is committed and/or a PR is opened **in the same session**, entries get their
commit sha and PR link backfilled. Work committed later or elsewhere won't auto-link; use
`/journal link`, or let the next recap surface it.

## 6. Guardrails

- **No secrets, no file contents.** Log file *paths* and a short summary — never file bodies. Redact Bash args matching `redact.patterns`; truncate to `maxArgLen`.
- **Append-only entries.** Entries are never deleted or reworded, and `JOURNAL.md` is regenerated from them. The one permitted in-place change is enriching an entry's `related` with a commit/PR link discovered later (see §5.6).
- **Staging is transient and git-ignored**, keyed by session id, so parallel sessions don't collide.
- **Bounded digest** so a long history never blows up a new session's context.

## 7. Testing strategy

- **Unit (no Claude):** `journal.mjs`/`stage.mjs` helpers — staging append, entry append, JSONL→MD render, redaction/truncation, digest selection (recent + rollup + open threads), id generation.
- **Integration:** fixture repo — simulate staged facts → safety-net produces an `unclassified` entry; digest mode emits a bounded summary; a Bash pattern is tagged infra/deploy and redacted.
- **Manifest validation:** `plugin.json` validates.
- **Skill trigger accuracy:** `journal-logger` activates on change-completion, not on reads.

## 8. Success criteria

1. `journal-logger` validates and installs from the marketplace.
2. Editing files during a task stages facts; completing the task yields one classified entry in `entries.jsonl` and a rendered `JOURNAL.md`.
3. A watched deploy/infra Bash command is captured and tagged, with args redacted/truncated.
4. Ending a turn with unflushed facts yields a mechanical `unclassified` entry (nothing lost).
5. A new session surfaces a bounded journal digest via the SessionStart hook; `/journal-recap` answers a filtered query.
6. Committing in the same session backfills `related.commit` (and `related.pr` when a PR is opened) onto recent entries.
7. Committing + pulling the repo on another machine carries the full journal; a fresh session there gets the recap.
8. No secrets or file contents ever appear in the journal.
9. Unit + integration tests pass.

## 9. Known unknowns (to confirm by live test)

- Exact `Stop` and `SessionStart` hook behavior and the shape required to inject context — designed from known patterns, but unproven until the plugin is installed and run live (same verification gap as `code-quality`).
- Reliable `sessionId` source inside hook payloads for staging keys.
- Parsing a PR URL reliably from `gh pr create` output for commit/PR backfill.

## 10. Relationship to the kit

A standalone, cross-cutting plugin — independent of `code-quality`. Its structured `entries.jsonl` is intended to feed later devkit phases: changelog/release-note generation, a "what changed" dashboard, and tracing infra/deploy actions back to the task that caused them.
