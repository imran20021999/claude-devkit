# Kotlin — Good Practices

Apply on top of the generic coding standards.

- Prefer `val` over `var`; immutability by default.
- Null safety: avoid `!!`; use `?.`, `?:`, and scope functions (`let`/`run`) to handle nullables.
- `data class` for models; `sealed class`/`interface` for restricted hierarchies with exhaustive `when`.
- Use extension functions and scope functions (`apply`/`also`/`let`/`run`/`with`) for clarity, not cleverness.
- Coroutines for async: structured concurrency (`coroutineScope`), correct `Dispatchers`, never block.
- Expression bodies and named/default arguments over overload sprawl.
- Tooling: ktlint + detekt as gates.
