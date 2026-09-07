# Logging

Centralized logging is implemented via the Datadog Agent (Helm chart),
rather than a self-hosted solution like Loki.

## Why
Loki's default configuration requires a PersistentVolumeClaim, which
failed to bind in this EKS cluster due to a StorageClass/CSI driver
provisioner mismatch (documented in docs/troubleshooting/). Datadog's
Agent ships logs directly without needing cluster-local persistent
storage, avoiding this blocker.

## What's collected
- All container stdout/stderr logs, tagged by namespace/pod/deployment
- Searchable via Datadog's Log Explorer: kube_namespace:employee-management-app

## Trade-off
Log data leaves the cluster and AWS account entirely, sent to Datadog's
infrastructure — the reasoning is documented in
docs/decisions/logging-solution.md