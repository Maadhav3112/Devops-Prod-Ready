# Prometheus

Metrics collection and storage for the employee management platform,
installed as part of the `kube-prometheus-stack` Helm chart alongside
Grafana and Alertmanager.

## What's installed

| Component | Purpose |
|---|---|
| `prometheus-monitoring-kube-prometheus-prometheus-0` | Time-series metrics database + query engine |
| `monitoring-kube-prometheus-operator` | Manages Prometheus config via CRDs (`ServiceMonitor`, `PrometheusRule`) |
| `monitoring-kube-state-metrics` | Exposes Kubernetes object state (Deployments, Pods, etc.) as metrics |
| `monitoring-prometheus-node-exporter` | Node-level CPU/memory/disk metrics (one per node — 3 total) |
| `alertmanager-monitoring-kube-prometheus-alertmanager-0` | Routes and fires alerts based on `PrometheusRule` definitions |

## Installation

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace
```

## Verifying it's running

```bash
kubectl get pods -n monitoring
```
Expect `Running` for all Prometheus, Alertmanager, kube-state-metrics, and
node-exporter pods (one node-exporter per cluster node).

## Accessing the Prometheus UI

```bash
kubectl port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090 -n monitoring
```
Open `http://localhost:9090`. Use the **Status → Targets** page to confirm
all scrape targets (including `employee-app`, if annotated) show `UP`.

## Scraping employee-app metrics

For Prometheus to scrape custom metrics from `employee-app` (beyond the
default node/kube-state metrics), the app needs either:
- A `ServiceMonitor` CRD pointing at the app's metrics port, **or**
- Pod annotations:
  ```yaml
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
  ```
  (Requires the app to expose a `/metrics` endpoint, e.g. via
  `prom-client` in Node.js — not yet implemented; currently Prometheus
  monitors infrastructure/cluster-level metrics only.)

## Alert rules

See [`../alerts.md`](../alerts.md) for the specific `PrometheusRule`
definitions configured for this project (Pod restarts, high CPU/memory,
unavailable replicas) and the Condition → Detection → Alert →
Investigation → Resolution walkthrough required by Section 7.

## Known constraints

- Running on `t3.small` (2GB RAM) nodes — Prometheus retention and
  resource requests were kept low to avoid resource pressure on other
  workloads (see `docs/troubleshooting/log.md`, Issue #5, where this
  stack's footprint caused `argocd-server` port-forward instability).
- Default retention: 10 days (Helm chart default) — acceptable for a
  short-lived class project; would need PVC-backed storage and longer
  retention for real production use.

## Technical Decision Record

**Why Prometheus over an alternative (e.g. Datadog metrics)?**
Prometheus is the assignment's suggested default, is fully open-source
with no licensing cost, and integrates natively with Kubernetes via
`ServiceMonitor`/`PodMonitor` CRDs. Chosen over relying solely on
Datadog's infrastructure monitoring so the project demonstrates the
open-source stack explicitly named in the assignment brief, with Datadog
used specifically for logging where Loki hit environment-specific
storage blockers (see `docs/decisions/logging-stack.md`).