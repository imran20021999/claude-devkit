---
description: Evidence-backed review of the current diff (or a file/dir/PR) across correctness, security, silent failures, test coverage, SOLID, and standards — with a verdict.
argument-hint: "[path | PR number] [--fix] [--post]"
---

Run a quality review following the **quality-review** skill (apply its Evidence Gate) and load the
**coding-standards** skill plus the matching per-language guide(s) in `${CLAUDE_PLUGIN_ROOT}/standards/`.

Target: `$ARGUMENTS`

Steps:
1. **Context (deterministic):** run `node "${CLAUDE_PLUGIN_ROOT}/hooks/review-context.mjs"` and read
   the JSON — detected **base branch** (never hardcode `main`), changed files, and whether tests were
   touched (`codeWithoutTests`).
2. **Resolve the target:**
   - No target → review the local diff from step 1.
   - A path → review that file/directory.
   - A number → **PR mode**: get the base with `gh pr view <n> --json baseRefName` and the diff with
     `gh pr diff <n>`. Check `gh pr view <n> --json mergeStateStatus,statusCheckRollup`; if CI is
     failing or there are conflicts, note it and cap the verdict at `NEEDS_WORK`.
3. **Gates:** `node "${CLAUDE_PLUGIN_ROOT}/hooks/run-gates.mjs" <changed files>`; fold results in. A
   failing blocking gate caps the verdict at `NEEDS_WORK`.
4. **Standards:** read `.devkit/standards.md` (if present), the coding-standards defaults, and the
   language guide(s) for the languages in the diff.
5. **Review** across the skill's dimensions (incl. silent failures and test-coverage-of-change) and
   apply the **Evidence Gate** — report only findings ≥80% confident, each with `file:line` + a
   concrete failure scenario. Zero findings is a valid result.
6. **Verdict + findings** ranked most-severe first; write a report to
   `.devkit/reviews/<target>.md` (e.g. `local.md` or `pr-<n>.md`).
7. **`--fix`** → apply only safe, mechanical fixes afterward.
8. **`--post`** (PR mode only) → publish with `gh pr review <n>` using `--approve` /
   `--request-changes` / `--comment` to match the verdict. **Only post when `--post` is given** —
   never post to a PR otherwise.
