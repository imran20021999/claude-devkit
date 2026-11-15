# C# — Good Practices

Apply on top of the generic coding standards.

- Enable nullable reference types (`<Nullable>enable</Nullable>`); treat warnings as errors.
- `async`/`await` all the way — never `.Result`/`.Wait()` (deadlocks); suffix async methods `Async`; `ConfigureAwait(false)` in libraries.
- Prefer `record` / `readonly struct` / init-only setters for immutable data.
- Use `var` when the type is obvious; expression-bodied members for brevity.
- Dispose with `using`; implement the dispose pattern correctly for owned resources.
- LINQ for queries, but mind deferred execution and N+1 against a DB.
- Dependency injection via the built-in container; avoid the service-locator anti-pattern.
- Pattern matching and switch expressions; use `nameof`; throw specific exceptions, no catch-all.
- Tooling: Roslyn analyzers, `dotnet format`; tests with xUnit/NUnit + FluentAssertions.
