# PHP — Good Practices

Apply on top of the generic coding standards.

- `declare(strict_types=1);` in every file; type-hint parameters, returns, and properties.
- Follow PSR-12 style and PSR-4 autoloading (Composer); format with PHP-CS-Fixer.
- Use modern PHP (8.x): enums, `readonly` properties, constructor promotion, `match`, nullsafe `?->`.
- Never interpolate user input into SQL — use PDO prepared statements; escape output (`htmlspecialchars`) against XSS.
- Prefer immutable value objects; avoid global state and superglobals in logic.
- Throw/catch specific exceptions, not generic `\Exception`.
- Static analysis: PHPStan or Psalm at a high level; tests with PHPUnit.
- Manage dependencies with Composer; never commit secrets — read from env/config.
