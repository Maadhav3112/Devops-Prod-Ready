# Kubernetes Probes

## Purpose

Probes let Kubernetes automatically detect and react to unhealthy or not-yet-ready containers.

| Probe | What it checks | Action on failure |
|-------|----------------|-------------------|
| **Liveness** | Is the process alive? | Restart the container |
| **Readiness** | Is the app ready to receive traffic? | Remove Pod from Service endpoints |

## Application Endpoints

| Endpoint | Used by |
|----------|---------|
| `/health` | Liveness probe |
| `/ready`  | Readiness probe |

## Typical Configuration (in Deployment)

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Observed Behaviour

- Continuous `GET /health` requests appear in application logs (visible via Argo CD and Datadog)
- When readiness fails, the Pod is removed from the Service → traffic only goes to healthy replicas
- When liveness fails, Kubernetes restarts the container

## Related Experiments

See [Controlled Failures](../docs/troubleshooting/controlled-failures.md) for the full Failure → Detection → Recovery results.
