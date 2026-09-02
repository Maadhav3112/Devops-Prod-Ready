# Datadog Dashboard – Resource Utilization

## Purpose

Provide a single view of:

- Pod status (Running / Ready)
- CPU usage vs limits
- Memory usage vs limits
- Restart counts
- Cluster / namespace overview

This supports the workflow: **Deploy → Observe → Detect → Investigate**.

## What Was Visible

From the Datadog Infrastructure and custom dashboard views:

| Resource | Observed |
|----------|----------|
| Application pods | Running, Ready, restart count |
| Argo CD components | application-controller, repo-server, server, redis, etc. |
| Observability controller | amazon-cloudwatch-observability-controller-manager |
| CPU / Memory graphs | Time-series against limits |
| Restart panels | Clear visibility of any restarts |

## Key Panels Used

1. **Pods list** – status, age, ready, restarts, CPU, memory
2. **CPU usage** – per pod / per namespace
3. **Memory usage** – per pod / per namespace
4. **Restart count** – quick detection of crash-loops
5. **Cluster / Namespace overview** – high-level health

## How It Was Used

- After deploying v1.0 and v2.0 → confirmed pods healthy
- After controlled pod deletion / crash → watched restart count and recovery
- After readiness failure → confirmed pod removed from traffic (Ready condition)

## Related Documents

- [Datadog Setup](../setup.md)
- [Alerts](../../alerts.md)
- [Controlled Failures](../../../docs/troubleshooting/controlled-failures.md)
