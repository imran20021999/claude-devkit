# React — Good Practices

Apply on top of the generic coding standards (and TypeScript's) whenever reviewing or writing React.

## Components
- Function components + hooks only for new code; no class components.
- Keep components small and single-purpose; extract complex logic into custom hooks (`useX`).
- Type props with TypeScript; no `any` props.

## Hooks
- Follow the Rules of Hooks: call them unconditionally, at the top level.
- Keep **complete dependency arrays** (enable `eslint-plugin-react-hooks`).
- Put side effects in `useEffect` with correct deps and a cleanup function; don't use `useEffect` for data you can derive during render.
- Memoize (`useMemo`/`useCallback`/`React.memo`) only where measured — avoid premature memoization.

## State
- Don't duplicate state — derive it during render where possible.
- Update state immutably; never mutate objects/arrays in place.
- Colocate state with the component that needs it; lift it up only when shared.
- Avoid prop drilling via composition or context — but use context sparingly (it re-renders consumers).

## Rendering & data
- List `key`s must be stable and unique — never the array index for dynamic lists.
- Always handle loading / error / empty states for async data; guard against stale responses (abort or ignore out-of-order results).
- Keep JSX declarative; push imperative logic into hooks/handlers.

## Accessibility
- Use semantic HTML, label form controls, provide `alt` text, support keyboard navigation; add ARIA only when semantics fall short.
