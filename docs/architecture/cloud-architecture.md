# Cloud Architecture (Proposed AWS Design)

> **Note:** No THIKSE production AWS credentials or infrastructure were used.  
> This is a proposed design for a production-grade deployment of the same application.

## High-Level Design

```text
Internet
    │
    ▼
Public Subnets
    │
    ├── NAT Gateway (outbound for private subnets)
    │
Private Subnets
    ├── Amazon EKS (control plane + managed node groups)
    │       └── Application Pods (replicas ≥ 2)
    │
    ├── Amazon RDS / Aurora (Multi-AZ) – Database
    │
    └── VPC Endpoints (optional – ECR, S3, Secrets Manager)
```

## Selected AWS Services

| Service | Why it was chosen |
|---------|-------------------|
| **Amazon VPC** | Network isolation, public/private subnets, multiple AZs |
| **Amazon EKS** | Managed Kubernetes control plane, integrates with IAM, supports the same manifests used locally |
| **Managed Node Groups** | Simplified worker node lifecycle, automatic updates |
| **Amazon ECR** | Private container registry, integrates with EKS image pull |
| **Amazon RDS / Aurora** | Managed relational database, Multi-AZ, automated backups, point-in-time recovery |
| **IAM + IRSA** | Least-privilege roles for nodes and for pods (IAM Roles for Service Accounts) |
| **Security Groups** | Restrict traffic to only required ports between components |
| **AWS Secrets Manager / SSM Parameter Store** | Centralized secret storage and rotation |
| **CloudWatch** | Native logs and metrics; can be forwarded to Datadog |
| **Datadog** | Unified observability (already used in the controlled environment) |
| **NAT Gateway** | Controlled outbound internet access from private subnets |

## What Was Implemented vs Proposed

| Component | Implemented (controlled environment) | Proposed for production |
|-----------|--------------------------------------|-------------------------|
| Kubernetes | Amazon EKS | Same (multi-AZ node groups) |
| Database | Container + PVC / local | RDS / Aurora Multi-AZ |
| Secrets | Kubernetes Secret | Secrets Manager + External Secrets Operator |
| Networking | Basic VPC / default | Full public/private subnet design |
| Observability | Datadog | Datadog + CloudWatch |
| IaC | Terraform | Same Terraform modules, remote state, workspaces |

## Related Documents

- [Kubernetes Architecture](./kubernetes-architecture.md)
- [Infrastructure as Code notes](../../terraform/) (root terraform folder)
- [Security Recommendations](../security/recommendations.md)
