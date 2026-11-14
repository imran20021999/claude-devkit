# claude-devkit

A standalone, general-purpose developer kit for Claude Code — built to carry a change through its whole life: **write → review → deploy → maintain → debug**.

The kit is a marketplace of small, independently installable plugins. Install only the phases you need.

## Plugins

| Plugin | Phase | Status |
| --- | --- | --- |
| [`code-quality`](plugins/code-quality) | Review / standards | ✅ Available |
| [`journal-logger`](plugins/journal-logger) | Maintain / history | ✅ Available |
| `deploy` | Deploy | 🔜 Planned |
| `debug` | Debug | 🔜 Planned |

## What's built

### code-quality
Language-agnostic coding standards, an on-demand review, and automated gates — driven by a single `.devkit/quality.json`.

- **`coding-standards` skill** — conventions Claude reads before writing/reviewing code; layer your own via `.devkit/standards.md`.
- **`/quality-review`** — reviews a diff/file/PR: runs your configured gates, then a semantic review, and prints a verdict (`PASS` / `PASS_WITH_NITS` / `NEEDS_WORK` / `BLOCKED`). `--fix` applies only safe fixes.
- **`/quality-init`** — scaffolds `.devkit/quality.json` + `.devkit/standards.md` (no overwrite).
- **Gate hook** — a `PostToolUse` hook runs your linters/formatters/type-checkers (`hooks/run-gates.mjs`).

### journal-logger
An always-on, per-project journal of every change Claude makes — code, deploy, infra — with cross-session, cross-machine recall.

- **Capture / safety-net / recap** — a `PostToolUse` hook stages facts, a `Stop` hook never loses a change, and a `SessionStart` hook injects a digest into new sessions.
- **`journal-logger` skill** — classifies each change (feature / enhancement / deprecation / bugfix / infra / deploy) and writes the *why*; one entry per logical change.
- **`/journal`** (manual entry or `link <commit|pr-url>`) and **`/journal-recap`** (summary / query).
- **Output committed with the repo** — `JOURNAL.md` (human view) + `.devkit/journal/entries.jsonl` (source of truth).

## Install

```bash
/plugin marketplace add imran20021999/claude-devkit
/plugin install code-quality@claude-devkit
/plugin install journal-logger@claude-devkit
```

## Develop & test

```bash
npm test
```

46 unit + integration tests across both plugins; manifests validate with `claude plugin validate`.

> **Status note:** the plugins' live in-session behavior (hooks actually firing, slash commands executing) has not yet been verified by an install-and-run. The test suite covers the Node helpers and all logic; a live test is the remaining step.

## Structure

```
.claude-plugin/marketplace.json   # marketplace manifest
plugins/<plugin>/                 # each plugin: skills/, commands/, hooks/
docs/superpowers/specs/           # phase design docs
tests/                            # unit + integration
```

## Design

Phase design docs live in [`docs/superpowers/specs/`](docs/superpowers/specs).

## Principles

- **Language-agnostic core** — real tools plugged in per project via config, nothing hardcoded to one stack.
- **One config, shared consumers** — consistent behavior across a plugin's pieces.
- **Opt-in, not all-or-nothing** — each phase is its own plugin.
