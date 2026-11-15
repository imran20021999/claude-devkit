# Java — Good Practices

Apply on top of the generic coding standards.

- Follow a standard style (e.g. Google Java Style); format with spotless / google-java-format.
- Favor immutability: `final` fields, `record` for data carriers (16+), unmodifiable collections.
- Never return `null` collections — return empty; use `Optional` for absent single values.
- Program to interfaces in signatures (`List`, not `ArrayList`); avoid raw generic types; always `@Override`.
- Use try-with-resources for `AutoCloseable`; don't swallow exceptions; throw specific types.
- Keep `equals`/`hashCode` consistent (or use `record`/`Objects.equals`/`Objects.hash`).
- Use Streams for transformations, but avoid side effects inside them; don't overuse.
- Prefer dependency injection (Spring/Guice) over static singletons and global state.
- Concurrency: use `java.util.concurrent` and immutable data over hand-rolled `synchronized`.
- Annotate nullability (`@Nullable`/`@NonNull`).
- Tooling: Checkstyle/SpotBugs/ErrorProne as gates; tests with JUnit 5 + AssertJ, Mockito for mocks.
