# Go — Good Practices

Apply on top of the generic coding standards whenever reviewing or writing Go.

## Errors
- Handle every error explicitly. Only discard with `_` when intentional and obvious.
- Wrap with context: `fmt.Errorf("doing X: %w", err)`; check with `errors.Is` / `errors.As`.
- Return errors; reserve `panic` for truly unrecoverable states, and `recover` only at boundaries.

## Interfaces & types
- **Accept interfaces, return structs.** Keep interfaces small (often 1–2 methods) and define them at the consumer, not the producer.
- Zero values should be useful; avoid pointers unless you need nil or mutation.
- Be consistent with pointer vs value receivers per type.
- Package names: short, lowercase, no underscores; avoid stutter (`http.Server`, not `http.HTTPServer`).

## Concurrency
- Never leak goroutines — every goroutine needs a clear stop path.
- Pass `context.Context` as the first parameter for cancellation/deadlines; don't store it in structs.
- Protect shared state with a mutex or channels; test with `-race`.

## Style & tooling
- `gofmt`/`goimports` always; run `go vet` + `golangci-lint` (or `staticcheck`) as gates.
- Use `defer` for cleanup (`Close`, `Unlock`); check `Close` errors where they matter.
- Keep functions short; avoid naked returns in long functions.
- Prefer the standard library; keep dependencies minimal.
- Table-driven tests with `t.Run` subtests.
