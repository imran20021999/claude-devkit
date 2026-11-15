---
name: quality-review
description: Use when reviewing code, a diff, or a PR for quality — correctness bugs, security, smells, complexity, duplication, SOLID, silent failures, missing test coverage, and standards violations — producing evidence-backed findings and a single verdict. Triggers on "review my code", "review this diff", "is this ready to merge", or the /quality-review command.
---

# Quality Review

Produce a rigorous, **evidence-backed** review and a single verdict. Precision over volume: a clean
change should produce few or zero findings.

## Inputs

- **Context** — run the deterministic helper first:
  `node "${CLAUDE_PLUGIN_ROOT}/hooks/review-context.mjs"` → JSON with the detected **base branch**
  (never assume `main`), the **changed files**, and whether the change **touched tests**
  (`testsTouched` / `codeWithoutTests`). Use it; don't guess git commands.
- **Target** — the current diff (default), or a file / directory / PR.
- **Standards** — the `coding-standards` skill defaults + `.devkit/standards.md` + the matching
  per-language guide(s) in `standards/`. The project file wins on conflict.
- **Gates** — the lint/type commands in `.devkit/quality.json` plus the built-in max-lines gate.

## Process

1. **Gather context** with `review-context.mjs`; resolve the target's changed files.
2. **Run the gates** on the changed files (`run-gates.mjs`). A failing *blocking* gate caps the
   verdict at `NEEDS_WORK`.
3. **Read the standards** (defaults + project file + language guides).
4. **Review** across the dimensions below.
5. **Apply the Evidence Gate** to every candidate finding before you report it.
6. **Emit** a verdict and the surviving findings, ranked most-severe first.

## Dimensions

- **Correctness** — logic errors, off-by-one, null/undefined, races, wrong/unhandled error paths.
- **Security** — injection, secrets in code, unvalidated input, unsafe deserialization, missing authz.
- **Silent failures** — swallowed exceptions (empty/`pass` catch), ignored error returns, unhandled
  promise rejections, errors logged-and-continued where the code should stop.
- **Test coverage of the change** — if `codeWithoutTests` is true (behavior changed but no test was
  added/updated), flag it; weight by risk.
- **Smells & complexity** — functions doing too much, deep nesting, unclear names, dead code.
- **Duplication / reusability** — repeated logic that should be factored.
- **SOLID** — single responsibility, open/closed, Liskov, interface segregation, dependency inversion.
- **Size thresholds** — file > 500 lines, function > 50, > 4 params, nesting > 3.
- **Standards violations** — anything contradicting the standards / language guides.

## Evidence Gate (apply to every finding)

Report a finding **only if all** hold:
1. You are **≥ 80% confident** it is a real problem.
2. It has a cited **`file:line`**.
3. It has a **concrete failure scenario** — specific inputs/state → wrong output/crash.
4. You **checked the surrounding code** and an existing guard doesn't already handle it.

For **CRITICAL/HIGH** findings also include the code snippet and **why existing validation/guards
don't catch it**.

**Zero findings is a valid, expected result.** Do not invent findings to appear thorough.

### Do NOT flag (false-positive skip list)
- Style/formatting a linter or formatter already handles.
- Subjective preferences with no concrete failure.
- Generated, vendored, or lock files; applying production rules to test fixtures.
- Pre-existing issues outside the diff, unless the diff depends on them to cause a bug.
- Intentional, documented deviations (see `.devkit/standards.md` "Exceptions").

## Severity

- **critical** — breaks in production or is a security hole. Blocks.
- **major** — a real bug or clear standards violation; fix before merge.
- **minor** — smell, duplication, missing test; fix soon.
- **nit** — trivial/subjective.

## Verdict

- **`PASS`** — no critical/major; nits only or none.
- **`PASS_WITH_NITS`** — only minor/nit findings.
- **`NEEDS_WORK`** — one or more major findings, a failing blocking gate, or (for a PR) failing CI.
- **`BLOCKED`** — one or more critical findings.

## Output format

```
Verdict: <VERDICT>   (base: <branch>, files: <n>, tests touched: yes/no)

Findings (most severe first):
1. [critical] path/to/file.ext:42 — <one-line summary>
   Failure: <inputs/state → wrong result>; why guards miss it: <...>; Fix: <...>
2. [minor] ...

Gates: <pass/fail per gate>
```

If nothing survives the Evidence Gate, say so plainly and emit `PASS`.

## `--fix` mode

After reporting, apply **only safe, mechanical fixes** (formatter/linter autofix, behavior-preserving
changes). Never change behavior under `--fix`; list behavioral changes as findings instead.
