# Rust — Good Practices

Apply on top of the generic coding standards.

- Let the borrow checker guide you; avoid `unsafe` unless necessary and document why.
- Error handling with `Result<T, E>` and `?`; `thiserror` for libraries, `anyhow` for applications.
- Avoid `unwrap()`/`expect()` on recoverable paths (fine in tests/prototypes); use `Option`, never null.
- Pattern-match exhaustively; prefer iterators and combinators over manual loops.
- Borrow (`&`, `&str`, `&[T]`) instead of moving/cloning where possible; minimize `.clone()`.
- Derive common traits (`Debug`, `Clone`, `PartialEq`); implement `From`/`Into` for conversions.
- Keep the `pub` surface minimal; explicit module visibility.
- Concurrency: respect `Send`/`Sync`; use `Arc`/`Mutex` deliberately, channels or `tokio` for async.
- Tooling: `rustfmt` + `clippy` as gates (deny warnings in CI); tests in `#[cfg(test)]` modules.
