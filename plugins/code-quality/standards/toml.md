# TOML — Good Practices

Apply on top of the generic coding standards.

- Use for configuration (e.g. `Cargo.toml`, `pyproject.toml`); organize with clear `[sections]`.
- Quote strings; be explicit with types; use arrays of tables (`[[x]]`) for lists of items.
- Group and order sections logically; comment non-obvious keys.
- Don't store secrets; validate against the consuming tool's expected schema.
