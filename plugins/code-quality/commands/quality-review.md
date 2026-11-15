---
description: Review the current diff (or a file/dir/PR) for correctness, smells, complexity, and standards violations, and emit a verdict with ranked findings.
argument-hint: "[path | PR number] [--fix]"
---

Run a quality review following the **quality-review** skill's methodology. Also load the
**coding-standards** skill so findings reference the right rules.

Target: `$ARGUMENTS`
- No target → review the current git diff (working tree + staged).
- A path → review that file or directory.
- A number → treat as a PR number and review its diff.
- `--fix` present → after reporting, apply only safe mechanical fixes (formatter/linter autofix,
  behavior-preserving changes). Never change behavior under `--fix`.

Steps:
1. Resolve the changed files for the target.
2. Run the gates: `node "${CLAUDE_PLUGIN_ROOT}/hooks/run-gates.mjs" <changed files>` and fold the
   results into the findings. A failing blocking gate caps the verdict at `NEEDS_WORK`.
3. Read `.devkit/standards.md` (if present) plus the coding-standards defaults. For each language present in the diff, also read the matching guide: `${CLAUDE_PLUGIN_ROOT}/standards/{typescript|go|react|python}.md`.
4. Review for correctness, security, smells/complexity, duplication, and standards violations.
5. Emit a single verdict (`PASS` / `PASS_WITH_NITS` / `NEEDS_WORK` / `BLOCKED`) and findings ranked
   most-severe first, each with `file:line` and a concrete fix.
