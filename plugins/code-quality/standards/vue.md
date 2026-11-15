# Vue — Good Practices

Apply on top of the generic coding standards (and TypeScript's).

- Use the Composition API with `<script setup>` and TypeScript for new code.
- Props down, events up; type/validate props and never mutate them.
- Use `ref`/`reactive` correctly; `computed` for derived state — don't duplicate state.
- `v-for` needs a stable `:key` (not the index for dynamic lists); don't combine `v-if` and `v-for` on one element.
- Keep components small and single-purpose; extract reusable logic into composables (`useX`).
- Use `<style scoped>`; avoid leaking global CSS.
- Prefer `computed` over `watch`; clean up watchers/effects.
- Tooling: ESLint (`eslint-plugin-vue`) + Prettier as gates.
