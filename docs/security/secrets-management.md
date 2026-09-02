# Secrets Management

## Principle

**Separate normal configuration from sensitive information.**

| Type | Storage | Examples |
|------|---------|----------|
| Configuration | ConfigMap / environment variables | Log level, port, feature flags, non-secret endpoints |
| Secrets | Kubernetes Secret | Database password, API tokens, TLS keys |

## Kubernetes Implementation

- `configmap.yaml` – non-sensitive settings
- `secret.yaml` – sensitive values (base64 encoded by Kubernetes)
- Pods reference both via `envFrom` or individual `env` entries
- Secrets are never baked into the Docker image

## Environment Separation

Different values can be supplied for:

- Development
- Testing
- Production *concepts*

without ever using real production credentials or production databases.

## Local Development

- Docker Compose uses `.env` files (git-ignored)
- Never commit real secrets to the repository

## Production Recommendations

- Move secrets to AWS Secrets Manager or SSM Parameter Store
- Use External Secrets Operator to sync into Kubernetes Secrets
- Enable automatic rotation where possible
- Audit secret access with CloudTrail

## Related Documents

- [Security Architecture](./security-architecture.md)
- [Kubernetes Architecture](../architecture/kubernetes-architecture.md)
- [Environment Configuration](../deployment/environment-config.md)
