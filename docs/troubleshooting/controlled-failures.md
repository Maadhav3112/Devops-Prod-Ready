# Controlled Failure & Recovery Experiments

## Purpose

Demonstrate Kubernetes self-healing and the investigation workflow:

**Failure → Detection → Investigation → Root Cause → Recovery**

## Experiments Performed

### 1. Delete an Application Pod

| Step | Result |
|------|--------|
| Action | `kubectl delete pod <app-pod>` |
| Detection | Deployment reports desired replicas not met |
| Recovery | Deployment controller creates a new Pod automatically |
| Outcome | Service restored; traffic continues on remaining healthy pods |

### 2. Cause Controlled Container Failure

| Step | Result |
|------|--------|
| Action | Force the application process to crash (or use a failing command) |
| Detection | Liveness probe fails; container restarts |
| Recovery | Container restarts according to restart policy; probes pass again |
| Outcome | Pod returns to Ready state |

### 3. Cause Readiness Failure

| Step | Result |
|------|--------|
| Action | Make readiness endpoint fail temporarily |
| Detection | Readiness probe fails |
| Behaviour | Pod is removed from Service endpoints |
| Recovery | Once probe succeeds, Pod is added back to endpoints |
| Outcome | End-user traffic is never sent to the unready Pod |

### 4. Incorrect Image Tag / Configuration

| Step | Result |
|------|--------|
| Action | Deploy a wrong image tag or missing ConfigMap reference |
| Detection | Argo CD shows OutOfSync / Degraded; pods may CrashLoop |
| Recovery | Fix the manifest / image tag and re-sync |
| Outcome | Application returns to Healthy / Synced |

### 5. Database Unavailability

| Step | Result |
|------|--------|
| Action | Stop or break database connectivity |
| Detection | Application logs connection errors; readiness may fail |
| Recovery | Restore database / volume; pods become ready again |
| Outcome | Data persists because of the PersistentVolumeClaim |

## Summary

Kubernetes + Argo CD + probes successfully detected and recovered from the controlled failures. The same patterns apply in production (with the addition of alerting and on-call procedures).

## Related Documents

- [Kubernetes Architecture](../architecture/kubernetes-architecture.md)
- [Argo CD Sync Issues](./argo-cd-sync-issues.md)
- [Rollback Guide](../deployment/rollback.md)
