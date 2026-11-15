# SQL — Good Practices

Apply on top of the generic coding standards.

- Always parameterize queries — never concatenate user input (SQL injection).
- Select only the columns you need (no `SELECT *` in application code); write explicit `JOIN ... ON`.
- Index columns used in `WHERE`/`JOIN`/`ORDER BY`; watch for ORM N+1 queries.
- Use short transactions for multi-statement consistency.
- Enforce data integrity with constraints (`NOT NULL`, `FK`, `UNIQUE`, `CHECK`).
- Migrations are versioned, reviewed, and reversible — never edit an applied migration.
- Qualify names, use consistent casing and meaningful aliases; mind `NULL` comparison semantics.
