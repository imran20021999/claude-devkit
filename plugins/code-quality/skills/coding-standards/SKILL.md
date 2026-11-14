---
name: coding-standards
description: Read before writing or reviewing code in any project. Establishes language-agnostic quality conventions (naming, structure, error handling, dependencies, security, testing) and layers in project-specific house rules from .devkit/standards.md when present. Use when implementing a feature or fix, or when reviewing a diff, so output matches house style.
---

# Coding Standards

Apply these conventions whenever you write or review code. They are **language-agnostic defaults**. If the project has a `.devkit/standards.md`, read it and let its rules **override or extend** everything below — the project file wins on any conflict.

## Step 0 — Load project rules

Before applying the defaults, check for `.devkit/standards.md` in the project root. If it exists, read it. Treat it as the source of truth for this project; the defaults below fill the gaps it leaves.

## Defaults

### Naming
- Names say what a thing is or does; no abbreviations that aren't domain-standard.
- Booleans read as predicates (`is_ready`, `hasAccess`). Functions are verbs; values are nouns.
- One concept, one name across the codebase. Don't rename a thing as it travels.

### Structure & size
- One unit = one clear purpose. If you can't say what a function does in a sentence without "and", split it.
- Prefer small, focused files. A file that keeps growing is a signal it's doing too much.
- Keep nesting shallow — return early instead of deepening `if` ladders.
- Make illegal states unrepresentable where the language allows it.

### Error handling
- Handle errors where you can act on them; don't swallow them silently.
- Fail loudly in development, degrade gracefully in production.
- Error messages name what failed, with enough context to act — never just "error".
- Never catch-and-ignore. If you intend to ignore, say why in a comment.

### Comments & docs
- Comment the *why*, not the *what*. The code already says what.
- A public unit's contract (inputs, outputs, side effects, failure modes) should be discoverable without reading its internals.
- Delete commented-out code; version control remembers it.

### Dependencies & security
- Add a dependency only when it earns its weight; prefer the standard library.
- Prefer the latest stable version of anything you add or touch.
- Never hardcode secrets, tokens, or credentials. Read them from env/config.
- Validate and parameterize all external input (SQL, shell, paths, URLs). Never build a query or command by string concatenation of untrusted input.

### Testing
- Every behavior change comes with a test that would fail without it.
- Test the contract (observable behavior), not the internals.
- Keep tests fast and isolated; no shared mutable state between tests.

### Change hygiene
- Make surgical changes: every edited line should trace to the task. Don't "improve" adjacent code uninvited.
- Match the style of the file you're editing over imposing a global style.
- Write the minimum that solves the problem — no speculative abstraction or unrequested configurability (YAGNI).

## When reviewing
Flag violations of the above (project file first, then defaults), ranked by severity. Distinguish correctness bugs from style nits. Prefer concrete, actionable findings with `file:line`.
