# C / C++ — Good Practices

Apply on top of the generic coding standards.

## C++ (prefer modern C++17/20)
- RAII for all resources; use smart pointers (`unique_ptr`/`shared_ptr`) — no manual `new`/`delete`.
- Follow the Rule of Zero/Five; `=default`/`=delete` special members explicitly.
- `const`-correctness everywhere; pass large types by `const&`; use `string_view`/`span` for views.
- Prefer standard containers/algorithms over hand-rolled loops and C-style arrays.
- Use `constexpr`/`enum class` over macros; `static_cast`/`dynamic_cast` over C-style casts.
- Initialize every variable; avoid undefined behavior (bounds, signed overflow, uninitialized reads).

## C
- Check every return code; free what you allocate (match alloc/free owners).
- Bound all buffer operations — never `gets`, `strcpy`, `sprintf`; use the `n` variants / explicit sizes.
- Use `size_t` for sizes; validate all external input.

## Tooling
- Build with `-Wall -Wextra -Werror`; run clang-tidy, AddressSanitizer/UBSan, clang-format.
- Tests with GoogleTest or Catch2.
