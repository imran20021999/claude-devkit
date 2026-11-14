---
name: quality-review
description: Use when reviewing code, a diff, or a PR for quality — correctness bugs, code smells, complexity, duplication, and coding-standards violations — and producing a single verdict with ranked findings. Triggers on requests like "review my code", "review this diff", "is this ready to merge", or the /quality-review command.
---

# Quality Review

Produce a rigorous, actionable review of a set of changes and a single verdict.

## Inputs

- **Target** — the current diff (default), or a file / directory / PR specified by the caller.
- **Standards** — the `coding-standards` skill defaults, plus the project's `.devkit/standards.md` if present. The project file wins on conflict.
- **Gates** — the lint/format/type commands in `.devkit/quality.json`.

## Process

1. **Resolve the target.**
   - Diff (default): changed files via `git diff --name-only` (plus staged: `git diff --cached --name-only`).
   - File/dir: review those paths.
   - PR: fetch the PR diff (e.g. `gh pr diff <n>`), review the changed files.
2. **Run the gates first.** Invoke the gate runner on the changed files:
   `node "${CLAUDE_PLUGIN_ROOT}/hooks/run-gates.mjs" <file> ...`
   Fold any gate failures into the findings. A failing **blocking** gate caps the verdict at `NEEDS_WORK` or worse.
3. **Read the standards** (defaults + project file) so findings reference the actual rules.
4. **Semantic review** across these categories:
   - **Correctness** — logic errors, off-by-one, null/undefined, race conditions, wrong error handling, unhandled failure modes.
   - **Security** — unvalidated input, injection, secrets in code, unsafe deserialization, missing authz.
   - **Smells & complexity** — functions doing too much, deep nesting, unclear names, dead code.
   - **Duplication** — repeated logic that should be factored.
   - **Standards violations** — anything contradicting the standards.
5. **Rank findings by severity** (see below) and attach `file:line`.

## Severity

- **critical** — will break in production or is a security hole. Blocks.
- **major** — a real bug or a clear standards violation that should be fixed before merge.
- **minor** — smell, duplication, or style; fix soon.
- **nit** — trivial/subjective.

## Verdict

Emit exactly one:

- **`PASS`** — no critical/major findings; nits only or none.
- **`PASS_WITH_NITS`** — only minor/nit findings; safe to merge, cleanup suggested.
- **`NEEDS_WORK`** — one or more major findings, or a failing blocking gate.
- **`BLOCKED`** — one or more critical findings.

## Output format

```
Verdict: <VERDICT>

Findings (most severe first):
1. [critical] path/to/file.ext:42 — <one-line summary>
   <why it's wrong / failure scenario; concrete fix>
2. [minor] ...

Gates: <pass/fail summary per gate>
```

If there are no findings, say so plainly and emit `PASS`.

## `--fix` mode

When the caller passes `--fix`, after reporting, apply **only safe, mechanical fixes**:
- Formatter/linter autofixes (e.g. `ruff --fix`, `eslint --fix`, `prettier -w`).
- Pure, behavior-preserving changes.

Never apply changes that alter behavior under `--fix`; list those as findings for the human to decide.
