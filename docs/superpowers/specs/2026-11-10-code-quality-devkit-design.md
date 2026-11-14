# claude-devkit — Phase 1: Code Quality & Coding Standards (Design)

- **Date:** 2026-11-10
- **Status:** Approved (design); implementation not started
- **Author:** dany@beakops.com
- **Scope:** Phase one of a five-phase developer kit (write → review → deploy → maintain → debug). This spec covers the repo/marketplace skeleton plus the first plugin, `code-quality`.

## 1. Goal

Deliver a **standalone, general-purpose** Claude Code dev kit — independent of the existing Beak plugins and reusable across any project, team, or language. Phase one establishes:

1. The repo + marketplace skeleton that all future phase-plugins plug into.
2. The `code-quality` plugin, providing three capabilities:
   - **Standards reference** — conventions Claude reads before writing/reviewing code.
   - **Quality review** — an on-demand `/quality-review` command producing a verdict.
   - **Automated gates/hooks** — linters/formatters/type-checkers run automatically via config.

Standards *authoring* (generating conventions from an existing codebase) is explicitly **deferred** to a later iteration.

## 2. Non-goals

- Not bound to Beak standards, stacks, or Azure DevOps.
- No deploy / maintain / debug capabilities yet (future sibling plugins).
- No standards-authoring tooling in this phase.
- The kit does **not** mandate specific linters; it ships commented examples and lets teams configure their own.

## 3. Architecture

### 3.1 Repo & marketplace layout

```
claude-devkit/
├── .claude-plugin/
│   └── marketplace.json         # marketplace manifest; lists all devkit plugins (one now)
├── plugins/
│   └── code-quality/
│       ├── .claude-plugin/plugin.json
│       ├── skills/
│       │   ├── coding-standards/SKILL.md
│       │   └── quality-review/SKILL.md
│       ├── commands/
│       │   ├── quality-review.md    # /quality-review
│       │   └── quality-init.md      # /quality-init (scaffold config)
│       ├── hooks/
│       │   ├── hooks.json
│       │   └── run-gates.mjs        # gate runner (Node, cross-platform)
│       ├── templates/
│       │   ├── quality.json         # default config template
│       │   └── standards.md         # default standards template
│       └── README.md
├── docs/
│   └── superpowers/specs/           # this spec and future design docs
├── tests/
│   ├── unit/                        # gate runner unit tests
│   └── fixtures/                    # tiny python + ts fixture projects
└── README.md
```

One repo = one marketplace. `code-quality` is the first of five phase-plugins; later phases (`deploy`, `debug`, etc.) are added as sibling plugins under `plugins/` and registered in `marketplace.json`.

### 3.2 Components

**a) `coding-standards` skill (reference)**
- Language-agnostic `SKILL.md` of principles: naming, function/file size, error handling, comments, dependency & security hygiene, testing expectations.
- Reads optional project file `.devkit/standards.md` to layer in house-specific rules on top of the defaults.
- Pulled in by Claude *before writing or reviewing* code.
- Ships a customizable default standards template (`templates/standards.md`).

**b) `/quality-review` command + `quality-review` skill (review)**
- Targets: current diff (default), or a file / directory / PR passed as an argument.
- Flow: run configured gates (lint/type) → semantic review against the standards (correctness, smells, complexity, duplication, standards violations) → emit a **verdict**.
- Verdict scale: `PASS` / `PASS_WITH_NITS` / `NEEDS_WORK` / `BLOCKED`.
- Findings ranked by severity, each with file:line, a one-line summary, and a concrete failure scenario where applicable.
- Optional `--fix` applies only safe, mechanical fixes (e.g. formatter output), never behavioral changes.

**c) Automated gates/hooks**
- `hooks.json` registers:
  - a `PostToolUse` hook on `Edit`/`Write` — flags violations in changed files as work proceeds (non-blocking by default);
  - a manual/pre-commit-style gate invocation.
- `run-gates.mjs` (Node): reads config, matches changed files by glob, runs the mapped command, parses exit code/output, reports violations.
- Language-agnostic: commands are user-configured. The kit ships recommended defaults as **commented examples**, not enforced.

### 3.3 Config model (the glue)

A single project config `.devkit/quality.json` drives both the gate runner and the review command:

```jsonc
{
  "standards": ".devkit/standards.md",
  "gates": [
    { "name": "ruff",   "files": "**/*.py",       "command": "ruff check {files}", "blocking": true },
    { "name": "eslint", "files": "**/*.{ts,tsx}", "command": "eslint {files}",     "blocking": false }
  ]
}
```

- `{files}` is substituted with the matched, changed file paths.
- `blocking: true` means a non-zero exit fails the gate (and, in a pre-commit context, stops the commit); `false` means report-only.
- **One config, one standards source, two consumers** — the gate runner and the review command share the same `gates` list, so behavior stays consistent.

### 3.4 Data flow

```
.devkit/standards.md ─┬─► coding-standards skill (when writing)
   (+ built-in default)└─► quality-review (when reviewing)

.devkit/quality.json ─┬─► run-gates.mjs (hooks: PostToolUse / pre-commit)
                      └─► quality-review command (same gate list)
```

Two inputs (standards doc, config), each consumed by two well-isolated consumers. Each consumer can be understood and tested independently.

## 4. `/quality-init`

A lightweight command that scaffolds `.devkit/` into the current project by copying `templates/quality.json` and `templates/standards.md`, without overwriting existing files. Rationale: the gates are effectively unusable without a config, so a one-command setup removes the main adoption friction. Deliberately minimal — it copies templates, nothing more.

## 5. Runtime decisions

- **Gate runner language:** Node (`.mjs`). Cross-platform (Windows/macOS/Linux), dependency-light, no build step.
- **Portability:** all scripts must run on Windows (PowerShell/pwsh) and POSIX shells; avoid shell-specific constructs in the runner — invoke configured commands via the platform shell abstraction.

## 6. Testing strategy

- **Unit (no Claude needed):** `run-gates.mjs` — glob matching, `{files}` substitution, command assembly, exit-code/output parsing, blocking vs non-blocking logic.
- **Fixtures:** two tiny projects (`fixtures/py`, `fixtures/ts`) with a seeded lint violation each, to prove hooks fire and `/quality-review` surfaces findings.
- **Manifest validation:** `plugin.json` and `marketplace.json` validated against the plugin schema.
- **Skill trigger accuracy:** description checks for `coding-standards` and `quality-review` so they activate on the right prompts without over-triggering.

## 7. Governance / workflow constraints

- Per org policy and user instruction: **no `git init`, commit, push, or PR unless explicitly requested** — including for this spec. The repo is currently not under git; it stays that way until the user asks.
- Standards content shipped in `templates/standards.md` is a *starter* teams customize; it is not a copy of any Beak-owned standards asset.
- This kit is standalone and not governed by the Beak ADO-work-item requirement, as confirmed during brainstorming (standalone, general-purpose scope).

## 8. Success criteria

1. `claude-devkit` repo skeleton exists with a valid `marketplace.json` listing `code-quality`.
2. `code-quality` plugin installs and exposes: `coding-standards` skill, `quality-review` skill, `/quality-review` command, `/quality-init` command, and the gate hooks.
3. Running `/quality-init` in a fresh project creates `.devkit/quality.json` and `.devkit/standards.md` from templates without clobbering existing files.
4. With a configured gate, editing a file triggers the `PostToolUse` gate and a seeded violation is reported.
5. `/quality-review` on a diff runs gates + semantic review and prints a verdict with ranked findings.
6. Unit tests for `run-gates.mjs` pass; fixture-based checks demonstrate the end-to-end flow.
7. Manifests validate against the plugin schema.

## 9. Future phases (out of scope here)

`deploy`, `maintain`, `debug`, and a richer `write`/scaffold capability each become sibling plugins under `plugins/`, registered in the same marketplace. Standards *authoring* lands as an enhancement to the `code-quality` plugin.
