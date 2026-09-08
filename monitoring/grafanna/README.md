# Grafana

Dashboarding and visualization layer on top of Prometheus, installed as
part of the same `kube-prometheus-stack` Helm release.

## What's installed

- `monitoring-grafana` deployment (3 containers per pod: grafana,
  grafana-sc-dashboard sidecar, grafana-sc-datasources sidecar)
- Pre-configured **Prometheus data source**, wired automatically by the
  Helm chart to `monitoring-kube-prometheus-prometheus:9090`
- Default dashboards bundled with `kube-prometheus-stack` (Kubernetes
  cluster overview, node exporter, Pod resource usage, etc.)

## Installation

Installed together with Prometheus via the same Helm release — no
separate install step:
```bash
helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace
```

## Accessing Grafana

```bash
kubectl port-forward svc/monitoring-grafana 3001:80 -n monitoring
```
Open `http://localhost:3001`.

**Default credentials:**
```bash
kubectl get secret monitoring-grafana -n monitoring \
  -o jsonpath="{.data.admin-user}" | base64 --decode; echo
kubectl get secret monitoring-grafana -n monitoring \
  -o jsonpath="{.data.admin-password}" | base64 --decode; echo
```

## Dashboards in use

| Dashboard | Source | Purpose |
|---|---|---|
| Kubernetes / Compute Resources / Pod | Bundled default | Per-Pod CPU/memory for `employee-app` and `mongo` |
| Node Exporter / Nodes | Bundled default | Node-level resource pressure (relevant to Issue #5 in the troubleshooting log) |
| Kubernetes / Deployments | Bundled default | Rollout status, replica counts — useful during ArgoCD deploys |

## Verifying the Prometheus data source

**Connections → Data sources → Prometheus** → click **Save & test** —
should confirm "Data source is working." This is auto-provisioned by the
Helm chart's sidecar, so it should already be connected without manual
setup.

## Adding Loki/Datadog as an additional data source (if applicable)

If Loki was configured (see `docs/decisions/logging-stack.md` for why
this project ultimately used Datadog for logs instead):
```
Connections → Data sources → Add data source → Loki
URL: http://loki.monitoring.svc.cluster.local:3100
```
Not used in the final setup — logging is handled via Datadog, viewed in
the Datadog UI directly rather than through Grafana. Grafana here is
scoped to **metrics only** (Prometheus).

## Known constraints

- Dashboards and alert thresholds are the Helm chart defaults — not yet
  customized with app-specific panels (e.g. a dedicated `employee-app`
  request-rate/error-rate dashboard would require the app to expose
  Prometheus metrics first — see `../prometheus/README.md`).
- No persistent storage configured for Grafana itself — dashboard
  customizations made through the UI would be lost on Pod restart unless
  exported/version-controlled separately.

## Technical Decision Record

**Why Grafana over the Datadog dashboard UI for metrics?**
Since Prometheus was already chosen as the open-source metrics backend,
Grafana is the natural pairing (same Helm chart, zero extra install
cost) and keeps metrics visualization open-source and portable, separate
from the commercial Datadog tool used specifically for log aggregation.