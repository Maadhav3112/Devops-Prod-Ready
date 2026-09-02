# Environment Configuration

## Principle

All configuration is environment-based. No secrets or environment-specific values are hard-coded in source or images.

## Sources of Configuration

| Source | Used for | Notes |
|--------|----------|-------|
| Environment variables | Local Compose & containers | Loaded from `.env` (git-ignored) |
| ConfigMap | Non-sensitive K8s config | Log level, feature flags, non-secret endpoints |
| Kubernetes Secret | Sensitive values | DB password, tokens, etc. |
| Terraform variables | Infrastructure differences | Region, instance sizes, environment name |

## Environment Concepts Demonstrated

| Concept | Purpose |
|---------|---------|
| Development | Local Docker Compose, relaxed settings |
| Testing | CI pipeline, ephemeral resources |
| Production *concept* | EKS + stricter settings (still using controlled credentials only) |

Real production credentials, production databases and production API keys were **never** used.

## How to Change Configuration

1. Update the appropriate ConfigMap / Secret / `.env` file
2. Restart pods (or let Argo CD / Deployment roll them)
3. Verify with `/health` and `/ready` endpoints and logs

## Related Documents

- [Secrets Management](../security/secrets-management.md)
- [Local Compose](./local-compose.md)
- [Kubernetes Deploy](./kubernetes-deploy.md)
