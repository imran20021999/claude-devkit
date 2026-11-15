# Swift — Good Practices

Apply on top of the generic coding standards.

- Value types (`struct`/`enum`) by default; use `class` only for reference/identity semantics.
- Optionals: avoid force-unwrap `!`; use `if let` / `guard let` / `??`.
- `guard` for early exits — keep the happy path unindented.
- Protocol-oriented design; protocol extensions for default behavior.
- Errors via `throws` / `do-catch` / `Result`; prefer typed, meaningful errors.
- Prefer `let` over `var`; avoid retain cycles in closures with `[weak self]`.
- Concurrency: async/await and actors for shared mutable state; avoid data races.
- Follow the Swift API Design Guidelines (clear, fluent naming); SwiftLint + swift-format as gates.
