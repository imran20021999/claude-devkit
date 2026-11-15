# Ruby — Good Practices

Apply on top of the generic coding standards.

- Follow the community style guide; enforce with RuboCop (or Standard).
- Add `# frozen_string_literal: true`; `freeze` constants; prefer immutability where practical.
- Keep methods small and expressive; use iterators/blocks (`each`, `map`, `select`) over manual loops.
- Use keyword arguments for clarity over long positional lists; guard clauses over nested conditionals.
- Safe navigation (`&.`) for possibly-nil receivers; avoid `nil` surprises.
- Raise specific exception classes; rescue specific classes, never a bare `rescue`.
- Rails: skinny controllers / fat-but-focused models or service objects, strong parameters, scopes; avoid N+1 with `includes`/`preload`.
- Tooling: tests with RSpec or Minitest; Brakeman for Rails security.
