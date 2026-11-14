---
description: Scaffold code-quality config into this project — creates .devkit/quality.json and .devkit/standards.md from templates without overwriting existing files.
---

Scaffold the `code-quality` config for this project.

Do this:
1. Ensure a `.devkit/` directory exists in the project root (create it if missing).
2. For each template, copy it into `.devkit/` **only if the destination does not already exist** —
   never overwrite a file the user has edited:
   - `${CLAUDE_PLUGIN_ROOT}/templates/quality.json`  → `.devkit/quality.json`
   - `${CLAUDE_PLUGIN_ROOT}/templates/standards.md`   → `.devkit/standards.md`
3. Report what was created and what was skipped (already existed).
4. Then tell the user to edit `.devkit/quality.json` so the `gates` point at their project's real
   linters/formatters/type-checkers, and to fill in `.devkit/standards.md` with house rules.

Keep it minimal: copy the templates, report, and stop. Do not modify any other files.
