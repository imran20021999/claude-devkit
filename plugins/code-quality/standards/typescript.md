# TypeScript — Good Practices

Apply on top of the generic coding standards whenever reviewing or writing TypeScript.

## Types
- Keep `strict` on in `tsconfig` (`strictNullChecks`, `noImplicitAny`). Treat it as mandatory.
- Avoid `any`. Use `unknown` for untyped input and narrow it. Reserve `as` casts and non-null `!` for cases you can justify.
- Model shapes with `interface`/`type`; use **discriminated unions** for variants and a `never` exhaustiveness check in the `switch` default.
- Prefer string-literal unions over `enum`; use `as const` and `readonly` for immutable data.
- Make nullability explicit (`T | undefined`) and use optional chaining (`?.`) / nullish coalescing (`??`).
- Lean on utility types (`Partial`, `Pick`, `Omit`, `Record`) instead of hand-rolling.

## Correctness
- Always `===` / `!==`; never rely on implicit coercion.
- No floating promises — `await` or `return` every promise (enable `@typescript-eslint/no-floating-promises`).
- Throw `Error` (or subclasses), never strings; type `catch (e: unknown)` and narrow.

## Structure
- Prefer **named exports** over default exports (better refactors and autocomplete).
- Type function boundaries explicitly; let inference handle locals.
- Keep modules focused; avoid barrel files that create import cycles.

## Tooling
- ESLint + `@typescript-eslint`, Prettier for formatting. Wire both as gates in `.devkit/quality.json`.
