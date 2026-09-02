# Security Architecture

## Goals

- Protect the application, containers, cluster and pipeline
- Follow least-privilege principles
- Never embed real production secrets
- Detect vulnerabilities early in CI

## Implemented Controls

### Application & Container

| Control | Implementation |
|---------|----------------|
| Non-root execution | Container runs as non-root user |
| Minimal image | Multi-stage build, only runtime packages |
| No secrets in image | All sensitive values injected at runtime |
| Environment-based config | No hard-coded credentials or endpoints |
| Input validation / error handling | Application level |

### CI / CD

| Control | Implementation |
|---------|----------------|
| Dependency scanning | Scans libraries for known CVEs |
| Container image scanning | Scans final image before push |
| Secret detection | Prevents accidental commit of keys/passwords |
| Static analysis | Basic security / quality checks |
| Fail on critical findings | Pipeline stops on high-severity issues |

### Kubernetes & Cloud

| Control | Implementation |
|---------|----------------|
| Secrets vs ConfigMaps | Sensitive data only in Kubernetes Secrets |
| Least-privilege IAM | Dedicated node role + Terraform admin role with required policies only |
| RBAC | Argo CD and cluster access limited |
| Network isolation | Security Groups restrict traffic (proposed full design) |

## Proposed Additional Controls (Production)

- Admission controllers (OPA / Gatekeeper / Kyverno)
- NetworkPolicies between namespaces / pods
- Image signing and verification
- Runtime security (Falco)
- Centralized secret rotation (AWS Secrets Manager + External Secrets Operator)
- Regular penetration testing and dependency updates

## Related Documents

- [Secrets Management](./secrets-management.md)
- [Image Scanning](./image-scanning.md)
- [Recommendations](./recommendations.md)
- [IAM / Terraform issues](../troubleshooting/terraform-permissions.md)
- [EKS Node IAM issue](../troubleshooting/eks-node-iam-issue.md)
