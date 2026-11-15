# JSON — Good Practices

Apply on top of the generic coding standards.

- Emit strict JSON for data (double-quoted keys, no trailing commas, no comments); use JSONC/YAML/TOML where comments are needed.
- Pick one key-naming convention (camelCase or snake_case) and keep it consistent.
- Keep stable key ordering where you control output, for clean diffs.
- Validate documents against a JSON Schema; keep each file small and focused.
- Never store secrets in committed JSON.
- Format consistently (Prettier): arrays for lists, objects for keyed data.
