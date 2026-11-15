# CSS / SCSS — Good Practices

Apply on top of the generic coding standards.

- Pick a methodology (BEM or utility-first) and keep selectors shallow — avoid specificity wars.
- Use custom properties (CSS variables) for theme tokens; avoid magic numbers.
- Mobile-first and responsive: relative units (`rem`/`%`), modern layout (flexbox/grid).
- Avoid `!important`; keep specificity low and flat.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`; ensure sufficient color contrast.
- SCSS: nesting ≤ 3 levels; reuse via mixins/functions, not deep inheritance; prefer `@use` over `@import`, split into partials.
- Tooling: Stylelint + Prettier as gates.
