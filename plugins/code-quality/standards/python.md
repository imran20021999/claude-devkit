# Python — Good Practices

Apply on top of the generic coding standards whenever reviewing or writing Python.

## Style & types
- Follow PEP 8; format with Black (or ruff-format) and lint with Ruff.
- Add type hints to functions and returns; type-check with mypy or pyright.
- Use modern builtins generics (`list[str]`, `dict[str, int]`) and `collections.abc` for interfaces.
- Use f-strings over `%`/`.format`.

## Data & structure
- Model structured data with `dataclasses` (or Pydantic) instead of raw dicts/tuples; prefer `frozen=True` for immutability.
- Prefer comprehensions where readable; use generators for large/streamed sequences.
- Keep functions small; define `__all__`; never use wildcard imports.

## Correctness & errors
- Catch **specific** exceptions — never a bare `except:`; raise custom exception types.
- Avoid mutable default arguments (`def f(x=[])`); use `None` as a sentinel.
- Use context managers (`with`) for resources; prefer `pathlib` over `os.path`.

## Async
- Don't block the event loop in async code — use async libraries (`httpx`, `asyncpg`) and `await` I/O.

## Tooling & project
- Pin dependencies with Poetry/uv in a virtual environment; never commit secrets — read from env/config.
- Use `logging` (a module-level logger), not `print`.
- Test with pytest — use fixtures and `parametrize`.
