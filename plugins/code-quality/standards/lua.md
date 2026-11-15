# Lua — Good Practices

Apply on top of the generic coding standards.

- Declare everything `local` — variables are global by default; never pollute `_G`.
- Guard against `nil` before indexing; be careful with `and`/`or` as conditional expressions.
- Remember 1-based indexing; use `ipairs` for arrays, `pairs` for maps.
- Prefer `local function`; a module returns a table and should avoid side effects on `require`.
- Error handling with `pcall`/`xpcall`; the `return nil, err` idiom for recoverable failures.
- Build strings with `table.concat` / `string.format`, not repeated concatenation in loops.
- Lint with luacheck and follow a consistent style guide.
