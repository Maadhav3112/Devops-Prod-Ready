# CI/CD Architecture

## Overview

```text
Developer
    ↓
Git Repository (GitLab)
    ↓
CI Pipeline
    ├── Lint
    ├── Unit Tests
    ├── Build
    ├── Security Scan (dependency + secret detection)
    ├── Docker Build
    ├── Image Scan
    └── Push to Registry (version + latest tags)
          ↓
Container Registry
          ↓
Argo CD (GitOps)
          ↓
Kubernetes (EKS)
    ├── Pod 1
    └── Pod 2
          ↓
Application + Logs + Monitoring
```

## CI Pipeline (GitLab)

Stages (in order):

1. Checkout
2. Dependency Installation
3. Lint
4. Unit Tests
5. Application Build
6. Docker Build
7. Container Smoke Test
8. Security Scans
9. Push image (version tag + `latest` / `dev`)

**Failure behaviour:** Any important stage failure stops the pipeline. A controlled failure was introduced, investigated, fixed and documented.

## Container Registry

- Personal / internship registry
- Version-based tagging (`v1.0`, `v2.0`, …)
- `latest` / development tags also pushed
- Images are pulled by Kubernetes / Argo CD

## GitOps with Argo CD

- Desired state lives in Git (Kubernetes manifests)
- Argo CD continuously reconciles live cluster state with Git
- Application health and sync status are visible in the Argo CD UI
- Upgrade path demonstrated: v1.0 → v2.0
- Rollback: revert Git revision or use Argo CD history

## Security Gates in CI

| Check | Purpose |
|-------|---------|
| Dependency vulnerability scan | Catch known CVEs in libraries |
| Container image scan | Catch vulnerabilities in the final image |
| Secret detection | Prevent accidental commit of credentials |
| Static analysis | Basic code quality / security issues |

Pipeline fails (or warns according to severity policy) when critical issues are found.

## Related Documents

- [Security Architecture](../security/security-architecture.md)
- [Image Scanning](../security/image-scanning.md)
- [Rollback Guide](../deployment/rollback.md)
- [CI Pipeline Failure](../troubleshooting/ci-pipeline-failure.md)
