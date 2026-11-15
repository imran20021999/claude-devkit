# code-quality — Rules Reference

The complete set of rules `code-quality` applies. Two layers: **deterministic gates** (automatic
pass/fail) and **review rules** (qualitative, judged during `/quality-review`).

---

## A. Deterministic gates (automated)

Run by the `PostToolUse` hook (`run-gates.mjs`) and by `/quality-review`.

- **Max-lines gate** — files over **500 lines** are flagged. Warn-only by default; configurable
  (`maxLines.limit`), can be made blocking (`maxLines.blocking: true`) or disabled
  (`"maxLines": false`). Runs even with no config.
- **Configured tools** — any linters / formatters / type-checkers you declare in
  `.devkit/quality.json` (e.g. ruff, eslint, mypy, prettier, tsc), run per file glob. A `blocking`
  gate fails on a non-zero exit; a non-blocking gate only warns.

---

## B. Review rules (qualitative)

### SOLID
- **S — Single Responsibility** — one reason to change; flag a unit doing several unrelated things.
- **O — Open/Closed** — extend behavior without editing existing code; flag growing type-switches
  that must change for each new case (prefer polymorphism/strategy).
- **L — Liskov Substitution** — a subtype must work anywhere its base type does; flag overrides that
  throw, no-op, or strengthen preconditions.
- **I — Interface Segregation** — prefer small, specific interfaces; flag fat interfaces forcing
  clients to depend on methods they don't use.
- **D — Dependency Inversion** — depend on abstractions, not concretions; flag high-level code
  instantiating concrete low-level clients instead of receiving an injected abstraction.

### Size & structure
- File ≤ **500** lines · function ≤ **50** lines · ≤ **4** parameters · nesting depth ≤ **3**.
- One unit = one clear purpose (no "and" in its description).
- Keep nesting shallow — return early; make illegal states unrepresentable where possible.

### Correctness
- Logic errors, off-by-one, null/undefined, race conditions, wrong or unhandled error paths.

### Security
- No secrets, tokens, or credentials in code.
- Validate and parameterize all external input — never build SQL/shell/paths/URLs by string
  concatenation of untrusted input.

### Smells & complexity
- Functions doing too much, deep nesting, unclear names, dead code, commented-out code.

### Duplication / reusability
- Repeated logic that should be factored into a common function.

### Naming
- Descriptive; booleans read as predicates (`isReady`); verbs for functions, nouns for values; one
  concept, one name across the codebase.

### Error handling
- Handle errors where actionable; no silent swallow; messages name what failed, with context.

### Comments & docs
- Comment the *why*, not the *what*; a public unit's contract should be discoverable without reading
  its internals.

### Dependencies
- Add a dependency only when it earns its weight; prefer the standard library and the latest stable
  version.

### Testing
- Every behavior change comes with a test that would fail without it.
- Test the contract (observable behavior), not internals; keep tests fast and isolated.

### Change hygiene
- Surgical changes — every edited line traces to the task; don't "improve" adjacent code uninvited.
- Match the style of the file you're editing.
- YAGNI — write the minimum that solves the problem; no speculative abstraction.

---

## C. Verdict scale (`/quality-review`)

| Verdict | Meaning |
| --- | --- |
| `PASS` | No critical/major findings; nits only or none. |
| `PASS_WITH_NITS` | Only minor/nit findings; safe to merge, cleanup suggested. |
| `NEEDS_WORK` | One or more major findings, or a failing blocking gate. |
| `BLOCKED` | One or more critical findings. |

---

## D. Extending / overriding

- **Project rules** live in `.devkit/standards.md` — the review reads it and it **wins on conflict**
  with these defaults.
- **New hard rules** (complexity, import boundaries, formatting) → add the enforcing linter as a
  **gate** in `.devkit/quality.json`.
- **Tuning** — adjust `maxLines`, enable/disable types, and edit the standards file per project.
