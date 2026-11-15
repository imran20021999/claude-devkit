# HTML — Good Practices

Apply on top of the generic coding standards.

- Use semantic elements (`header`/`nav`/`main`/`article`/`section`/`footer`) over `div` soup.
- Accessibility: `alt` text, labels tied to inputs, landmark roles, logical heading order, keyboard focus; ARIA only when native semantics fall short.
- One `<h1>` per page; don't skip heading levels.
- `<button>` for actions, `<a href>` for navigation; descriptive link text (not "click here").
- Valid, well-formed markup; set `lang` and the viewport meta.
- Keep structure, style, and behavior separate (no inline styles/handlers).
- Performance: `loading="lazy"` and explicit `width`/`height` on images to avoid layout shift.
- Lint/validate with the W3C validator or htmlhint.
