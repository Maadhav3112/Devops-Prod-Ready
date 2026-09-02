# CI Pipeline Integration

## Overview

The CI pipeline connects **source code → tests → image → security → registry → GitOps**.

```text
Git Push
   ↓
Checkout
   ↓
Dependency Installation     ← install_deps
   ↓
Lint                        ← lint stage
   ↓
Unit Tests                  ← tests/unit/
   ↓
Build                       ← application build
   ↓
Docker Build                ← Dockerfile
   ↓
Container Test              ← tests/container/smoke_test.sh
   ↓
Security Scan               ← dependency + image + secrets
   ↓
Push to Registry            ← version + latest tags
   ↓
Argo CD detects new image / manifest change
   ↓
Kubernetes (EKS) updated
```

## How each folder connects

| Folder / File | CI Stage | Role |
|---------------|----------|------|
| `tests/unit/` | Unit Tests | Application unit tests must pass |
| `tests/container/smoke_test.sh` | Container Test | Starts image, checks `/health` |
| `scripts/test.sh` | Local helper | Same checks you can run outside CI |
| `scripts/build.sh` | Local helper | Mirrors Docker build step |
| `Dockerfile` | Docker Build | Produces the image |
| `.gitlab-ci.yml` | All stages | GitLab pipeline definition |
| `.github/workflows/ci.yml` | All stages | GitHub Actions alternative |
| `kubernetes/` | CD (Argo CD) | Desired state after image is pushed |
| `monitoring/` | Post-deploy | Observe pods, metrics, logs |

## Pipeline failure behaviour

- Any important stage failure stops the pipeline
- Controlled failure was demonstrated → investigated → fixed → documented
- See: `docs/troubleshooting/ci-pipeline-failure.md`

## Security gates

| Check | When | Effect |
|-------|------|--------|
| Dependency scan | After tests | Fails on high/critical CVEs |
| Image scan | After Docker build | Fails on high/critical image CVEs |
| Secret detection | Security stage | Fails if secrets found in code |

## From CI to cluster (GitOps)

1. CI builds and pushes `employee-app:<sha>` and `employee-app:latest`
2. Manifests in `kubernetes/` reference the image tag
3. Argo CD watches Git and syncs the cluster
4. Datadog observes the new pods (CPU, memory, restarts, logs)

## Local equivalent

```bash
./scripts/test.sh          # lint + unit + smoke (if image exists)
./scripts/build.sh v1.0    # build image
./tests/container/smoke_test.sh employee-app:v1.0
./scripts/deploy.sh        # optional manual apply
```

## Related Documents

- [CI/CD Architecture](./cicd-architecture.md)
- [Container Smoke Test](../../tests/container/smoke_test.sh)
- [CI Pipeline Failure](../troubleshooting/ci-pipeline-failure.md)
- [Rollback](../deployment/rollback.md)
