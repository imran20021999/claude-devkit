# code-quality

Language-agnostic coding standards, an on-demand quality review, and automated lint/format/type gates — driven by a single project config.

## What you get

- **`coding-standards` skill** — house conventions Claude reads *before* writing or reviewing code, including the **SOLID principles** and size thresholds (file ≤ 500, function ≤ 50, ≤ 4 params, nesting ≤ 3). Ships sensible defaults; layer your own via `.devkit/standards.md`.
- **`/quality-review`** — reviews the current diff (or a file/dir/PR): runs your configured gates, then a semantic review against the standards, and prints a verdict with ranked findings. `--fix` applies only safe, mechanical fixes.
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
