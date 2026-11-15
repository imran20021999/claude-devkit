# Project Coding Standards

> This file was scaffolded by `code-quality` (`/quality-init`). It **overrides and extends** the
> kit's built-in defaults. Edit it to capture your team's house rules. Delete anything you don't need.

## Language(s) & tooling

<!-- List the languages in this repo and the tools that enforce quality. These should match the
     `gates` in .devkit/quality.json. Example:
     - Python 3.12 — ruff (lint+format), mypy (types), pytest (tests)
     - TypeScript — eslint, prettier, tsc, vitest
-->

## House conventions

<!-- Rules specific to THIS project that go beyond the kit defaults. Examples:
     - Public functions require docstrings/JSDoc.
     - No direct DB access outside the `repositories/` layer.
     - All HTTP handlers return the standard `{ data, error }` envelope.
     - Feature flags are read only through `config.flags`, never env directly.
-->

## Naming

<!-- Project-specific naming rules, if any. e.g. "React components PascalCase; hooks use* prefix." -->

## What to flag in review

<!-- Anything reviewers in this repo should always check. e.g. "Any new env var must be documented
     in README and added to .env.example." -->

## SOLID & size (baked-in defaults)

These are checked by default in `/quality-review` and the coding-standards skill. Tune or remove any
that don't fit this project.

- **SOLID** — single responsibility, open/closed, Liskov substitution, interface segregation,
  dependency inversion.
- **Size** — file ≤ 500 lines (the max-lines gate warns past this), function ≤ 50 lines,
  ≤ 4 parameters, nesting depth ≤ 3.

## Exceptions

<!-- Document intentional deviations from the defaults so reviewers don't re-flag them. -->
