# Dockerfile — Good Practices

Apply on top of the generic coding standards.

- Use minimal, pinned base images (version or digest; prefer slim/alpine/distroless).
- Multi-stage builds — copy only the artifacts the final image needs.
- Order layers for cache efficiency (dependencies before app code); combine `RUN` steps and clean package caches.
- Run as a non-root `USER`; never bake secrets into layers (use build secrets, not `ARG` for credentials).
- Add a `.dockerignore`; set `WORKDIR`; `COPY` only what's needed.
- One concern per image; explicit `CMD`/`ENTRYPOINT`; add a `HEALTHCHECK` where useful.
- Scan images for CVEs (e.g. trivy) as a gate.
