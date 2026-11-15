# Dart / Flutter — Good Practices

Apply on top of the generic coding standards.

- Sound null safety: avoid `!`; use `?.`, `??`; reserve `late` for genuine cases.
- `final`/`const` by default; use `const` constructors for widgets (rebuild performance).
- Composition over inheritance for widgets; keep widgets small, extract sub-widgets over giant `build` methods.
- Keep `build` pure and cheap — no heavy work or side effects inside it.
- Manage state deliberately (Provider/Riverpod/Bloc); avoid unnecessary `setState`.
- Async UI with `FutureBuilder`/`StreamBuilder`; cancel subscriptions/controllers in `dispose`.
- Follow Effective Dart; `dart format` + `dart analyze` (lints via `analysis_options.yaml`) as gates.
