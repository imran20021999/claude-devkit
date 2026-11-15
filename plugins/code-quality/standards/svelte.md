# Svelte — Good Practices

Apply on top of the generic coding standards (and TypeScript's).

- Keep components small; use reactive declarations (`$:`) for derived state.
- Use props and context for local sharing; reserve stores for genuine cross-component state.
- Don't mutate props; update state immutably (assignment triggers reactivity).
- Keyed `{#each list as item (item.id)}` for dynamic lists.
- Use `{#await}` for async with loading/error branches.
- Clean up timers/subscriptions in `onDestroy`.
- Scoped styles by default — prefer them over `:global`.
- Tooling: TypeScript + ESLint (`eslint-plugin-svelte`) + Prettier.
