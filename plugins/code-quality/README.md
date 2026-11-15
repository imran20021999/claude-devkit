# code-quality

Language-agnostic coding standards, an on-demand quality review, and automated lint/format/type gates — driven by a single project config.

## What you get

- **`coding-standards` skill** — house conventions Claude reads *before* writing or reviewing code, including the **SOLID principles** and size thresholds (file ≤ 500, function ≤ 50, ≤ 4 params, nesting ≤ 3). Ships sensible defaults; layer your own via `.devkit/standards.md`. Includes per-language guides in [`standards/`](standards) for ~28 languages (TS, Go, Python, Java, C#, Rust, C/C++, JS, Ruby, PHP, Bash, Lua, Kotlin, Swift, Dart, Vue, Svelte, Angular, HTML, CSS, Markdown, YAML, JSON, TOML, Dockerfile, Terraform, SQL).
- **`/quality-review`** — **evidence-backed** review of the current diff (or a file/dir/PR): a deterministic context helper detects the base branch (never hardcodes `main`) and whether tests were touched; then a semantic review across correctness, security, silent failures, test-coverage-of-change, SOLID, duplication, and standards. Every finding must clear an **Evidence Gate** (≥80% confidence, `file:line`, a concrete failure scenario) — zero findings is a valid result. Emits a verdict, writes a report, and (with `--post`) can publish to a PR. `--fix` applies only safe fixes.
- **`/quality-init`** — scaffolds `.devkit/quality.json` and `.devkit/standards.md` into the current project (never overwrites existing files).
- **Automated gates** — a `PostToolUse` hook runs your configured linters/formatters/type-checkers on files as they change, plus a built-in **max-lines** gate (default 500 lines, warn-only).

## Setup

```bash
/quality-init
```

Then edit `.devkit/quality.json` to point at your project's real tools:

```jsonc
{
  "standards": ".devkit/standards.md",
  "gates": [
    { "name": "ruff",   "files": "**/*.py",       "command": "ruff check {files}", "blocking": true },
    { "name": "eslint", "files": "**/*.{ts,tsx}", "command": "eslint {files}",     "blocking": false }
  ]
}
```

- `{files}` is replaced with the matched changed files.
- `blocking: true` → a non-zero exit fails the gate; `false` → report-only.

## Requirements

- Node.js (for the gate runner). No other dependencies.
