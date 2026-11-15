# Angular — Good Practices

Apply on top of the generic coding standards (and TypeScript's).

- Follow the Angular style guide and use the CLI; enable `strict` mode, avoid `any`.
- Prefer `OnPush` change detection and immutable `@Input`s.
- Avoid subscription leaks: prefer the `async` pipe, or `takeUntil`/`takeUntilDestroyed` to unsubscribe.
- Split container (smart) and presentational (dumb) components; keep components small.
- Put logic in services with DI; `providedIn: 'root'` for singletons — avoid service locator.
- Reactive forms over template-driven for anything non-trivial.
- Lazy-load feature modules/routes; use `trackBy` with `*ngFor`.
- Tooling: angular-eslint + Prettier as gates.
