# Monitoring & Observability

## Goal

**Deploy → Observe → Detect → Investigate**

This folder documents the observability setup for the Employee Management platform.

## Stack Used

| Signal | Tool / Mechanism |
|--------|------------------|
| Metrics (CPU, memory, restarts) | Datadog |
| Logs | Application structured JSON logs → Datadog |
| APM | Datadog APM (enabled) |
| Health | Kubernetes Liveness & Readiness probes |
| Cluster / Pod status | Datadog Infrastructure view + `kubectl` |

## Namespace

Datadog components run in the `datadog-agent` namespace.

## Setup Steps (summary)

1. `kubectl config set-context --current --namespace=datadog-agent`
2. Create secret with API key + App key
3. Create `DatadogAgent` custom resource manifest
4. `kubectl apply -f datadog-agent.yaml`
5. Verify pods / DaemonSet
6. Confirm data in Datadog UI

Full details → [datadog/setup.md](./datadog/setup.md)

## Folder Structure

```text
monitoring/
├── README.md
├── probes.md
├── alerts.md
├── logs.md
└── datadog/
    ├── setup.md
    ├── datadog-agent.yaml
    └── dashboards/
        └── resource-utilization.md
```

## Quick Links

| Document | Description |
|----------|-------------|
| [Datadog Setup](./datadog/setup.md) | Complete install steps (1–6) |
| [DatadogAgent manifest](./datadog/datadog-agent.yaml) | CR used in Step 3/4 |
| [Probes](./probes.md) | Liveness & Readiness configuration |
| [Alerts](./alerts.md) | Signals and proposed alert rules |
| [Logs](./logs.md) | Structured JSON logging |
| [Resource Utilization Dashboard](./datadog/dashboards/resource-utilization.md) | What was observed in Datadog |

## What Was Observed

- All application and Argo CD pods visible in Datadog Infrastructure view
- CPU / Memory usage against limits
- Restart counts
- Continuous health-check traffic (`GET /health`) in logs
- Resource utilization dashboards used for investigation after controlled failures
