# Bash / Shell — Good Practices

Apply on top of the generic coding standards.

- Start scripts with `set -euo pipefail`; be deliberate about `IFS`.
- Quote every expansion: `"$var"`, `"$@"`; use `[[ ... ]]` over `[ ... ]`.
- Use `$(...)` not backticks; declare function-local vars with `local`.
- Check exit codes and command existence; fail loudly with a clear message to stderr.
- Don't parse `ls`; iterate with globs or `find -print0 | while IFS= read -r -d ''`.
- Create temp files with `mktemp`; clean up with `trap ... EXIT`.
- Never `eval` untrusted input; validate and quote all arguments.
- Lint with ShellCheck and format with shfmt (wire as gates).
- If it grows complex or needs data structures, switch to a real language.
