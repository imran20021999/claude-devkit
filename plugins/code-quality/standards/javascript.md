# JavaScript — Good Practices

Apply on top of the generic coding standards. (If you can, adopt TypeScript or JSDoc types.)

- ES modules; `const`/`let` only (never `var`); always `===`/`!==`.
- Prefer pure functions and immutable updates; avoid mutating shared/global state.
- Don't extend built-in prototypes; avoid implicit globals.
- Promises: use `async`/`await`, never leave them floating; `Promise.all` for parallel work; handle rejections.
- Use optional chaining (`?.`) and nullish coalescing (`??`); be deliberate about `null` vs `undefined`.
- Destructuring and spread; array methods (`map`/`filter`/`reduce`) over manual loops.
- Throw `Error` objects (not strings); wrap `await` in try/catch where failure is expected.
- Never `eval` or run untrusted input; validate external data.
- Tooling: ESLint + Prettier as gates.
