# Scripts

Helper scripts for local development, testing and operations.

## Available Scripts

| Script | Purpose |
|--------|---------|
| `build.sh` | Build the application and Docker image |
| `test.sh` | Run lint, unit tests and container smoke test |
| `health-check.sh` | Call `/health` and `/ready` endpoints |
| `deploy.sh` | Apply Kubernetes manifests (or trigger Argo CD sync) |
| `rollback.sh` | Roll back to a previous image tag / version |
| `setup/create-namespace.sh` | Create the application namespace |
| `setup/create-secrets.sh` | Create ConfigMap / Secret from environment variables |

## Usage

```bash
# Make scripts executable (once)
chmod +x scripts/*.sh scripts/setup/*.sh

# Build
./scripts/build.sh

# Test
./scripts/test.sh

# Health check (after deploy)
./scripts/health-check.sh http://localhost:8080

# Deploy (kubectl)
./scripts/deploy.sh

# Rollback to v1.0
./scripts/rollback.sh v1.0
```

> Never put real production secrets in these scripts. Use `.env` (git-ignored) or Kubernetes Secrets.
