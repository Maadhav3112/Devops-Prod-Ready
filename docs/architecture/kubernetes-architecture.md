# Kubernetes Architecture

## Cluster

- **Platform:** Amazon EKS
- **Access:** Controlled personal / internship account (no production credentials)

## Core Resources

| Resource | File | Purpose |
|----------|------|---------|
| Namespace | `namespace.yaml` | Isolation of all application resources |
| Deployment | `deployment.yaml` | Desired state of application pods (≥ 2 replicas) |
| Service | `service.yaml` | Stable network endpoint for the pods |
| ConfigMap | `configmap.yaml` | Non-sensitive configuration |
| Secret | `secret.yaml` | Sensitive values (DB password, tokens, etc.) |
| Storage | `storage.yaml` | PersistentVolumeClaim for database data |

## Deployment Design

- **Replicas:** Minimum 2 for high availability
- **Resource requests & limits:** Defined for CPU and memory
- **Liveness probe:** Restarts container if process is unhealthy
- **Readiness probe:** Removes pod from Service until it is ready to serve traffic
- **Rolling update strategy:** Used for zero-downtime upgrades

## Self-Healing Behaviour

| Experiment | Observed Result |
|------------|-----------------|
| Delete an application Pod | Deployment controller immediately creates a replacement Pod |
| Cause controlled container failure | Container restarts according to restart policy; probes pass again |
| Cause readiness failure | Pod is removed from Service endpoints; traffic goes only to healthy pods |

## Configuration & Secrets

- Normal configuration → ConfigMap / environment variables
- Sensitive information → Kubernetes Secret
- Different values can be supplied for development / testing / production *concepts* without using real production credentials

## Database & Persistence

- Database is initialized on first start
- Application connects using credentials from Secret
- Data is stored on a PersistentVolumeClaim
- Data survives controlled application and database restarts
- **Local limitation:** Single-node / single-AZ storage. Production would use Multi-AZ managed database (RDS / Aurora) with automated backups.

## Related Documents

- [Cloud Architecture](./cloud-architecture.md)
- [Secrets Management](../security/secrets-management.md)
- [Kubernetes Deployment Guide](../deployment/kubernetes-deploy.md)
- [Controlled Failures](../troubleshooting/controlled-failures.md)
