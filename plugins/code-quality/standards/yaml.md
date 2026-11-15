# YAML — Good Practices

Apply on top of the generic coding standards.

- Indent with 2 spaces — tabs are invalid in YAML.
- Quote ambiguous scalars: `"yes"/"no"/"on"/"off"`, version-like strings (`"1.10"`), leading zeros, and anything that could be read as a bool/number (the "Norway problem": bare `no` → `false`).
- Keep structures flat and readable; prefer block style over flow style for complex data.
- Use anchors/aliases (`&`/`*`) to avoid duplication — but sparingly; separate documents with `---`.
- Never commit secrets — reference env vars or a secret store.
- Validate against a schema (CI, Kubernetes, etc.) and lint with yamllint.
