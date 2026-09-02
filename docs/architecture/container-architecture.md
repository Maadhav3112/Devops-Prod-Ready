# Container Architecture

## Goals

- Small, secure, reproducible images
- Non-root execution
- Environment-based configuration
- Clean logs and graceful shutdown
- Easy local multi-container development

## Dockerfile Principles

| Requirement | Implementation |
|-------------|----------------|
| Appropriate base image | Minimal official language runtime image |
| Clean structure | Multi-stage build (build stage → runtime stage) |
| Avoid unnecessary packages | Only runtime dependencies in final image |
| Non-root execution | `USER` directive runs as non-root |
| Environment-based config | All settings via environment variables |
| Only required port | Single `EXPOSE` for the application port |
| Useful logs | Application writes structured logs to stdout |
| Graceful shutdown | Handles `SIGTERM` and closes connections cleanly |

## Image Selection & Optimization

- Base image chosen for size and security (regular updates, small attack surface)
- Multi-stage build discards build tools and source from the final image
- `.dockerignore` excludes tests, docs, `.git`, local env files, etc.
- Resulting image is tagged with both version and `latest` / `dev` tags

## Runtime Configuration

| Setting | Source |
|---------|--------|
| Database URL | Environment variable / Kubernetes Secret |
| Port | Environment variable (default 8080) |
| Log level | Environment variable |
| Feature flags | Environment variable / ConfigMap |

## Docker Compose (Local Multi-Container Environment)

```text
Docker Compose
      │
 ┌────┴────┐
 │         │
App     Database
 │
 └── Docker Network
```

Configured elements:

- Application service
- Database service
- Named volume for database data (persists across restarts)
- Shared Docker network
- Environment variables
- Health checks
- Restart policy (`unless-stopped` / `on-failure`)

**Important:** Database data must (and does) survive container restarts because it is stored on a Docker volume.

## Related Documents

- [Application Architecture](./application-architecture.md)
- [Local Compose Deployment](../deployment/local-compose.md)
- [Image Scanning](../security/image-scanning.md)
