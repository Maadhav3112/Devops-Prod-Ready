# Alerts & Detection

## Signals Monitored

| Signal | Source | Why it matters |
|--------|--------|----------------|
| High restart count | Datadog / Kubernetes | Indicates crash-loop or repeated failures |
| Elevated CPU / Memory | Datadog | Resource pressure or leak |
| Readiness probe failures | Kubernetes events + Datadog | Pod is not receiving traffic |
| Pod not Ready | Datadog Infrastructure view | Scheduling or startup problem |
| Application error logs | Datadog Logs | Business / runtime errors |

## Proposed Alert Rules (Production)

These were not fully configured in the controlled environment but are the natural next step:

1. **Restart count > 3 in 10 minutes** → notify
2. **CPU > 80% of limit for 5 minutes** → notify
3. **Memory > 85% of limit for 5 minutes** → notify
4. **Readiness probe failing on all replicas** → critical
5. **No healthy pods for the Service** → critical

## Investigation Workflow

```text
Alert fires
    ↓
Open Datadog dashboard / Infrastructure view
    ↓
Check Pod status, restarts, CPU/Memory
    ↓
Inspect application logs
    ↓
Correlate with recent deployments (Argo CD)
    ↓
Fix → verify recovery
```

## Related Documents

- [Datadog Setup](./datadog/setup.md)
- [Controlled Failures](../docs/troubleshooting/controlled-failures.md)
- [Resource Utilization Dashboard](./datadog/dashboards/resource-utilization.md)
