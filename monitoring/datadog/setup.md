# Datadog Setup & Installation Steps

## Prerequisites

- Working EKS cluster
- `kubectl` configured
- Datadog Operator installed in the cluster
- Datadog account (API key + App key)

---

## Step 1 – Switch to Datadog namespace

```bash
kubectl config set-context --current --namespace=datadog-agent
```

This ensures subsequent commands target the dedicated Datadog namespace.

---

## Step 2 – Create the Datadog secret (API key + App key)

```bash
kubectl create secret generic datadog-secret \
  --from-literal api-key=<DATADOG_API_KEY> \
  --from-literal app-key=<DATADOG_APP_KEY>
```

> Run this while the current context namespace is `datadog-agent` (Step 1).  
> Never commit the real API key or App key to Git.

---

## Step 3 – Create the DatadogAgent manifest

Create a file (e.g. `datadog-agent.yaml`) with:

```yaml
apiVersion: datadoghq.com/v2alpha1
kind: DatadogAgent
metadata:
  name: datadog
spec:
  global:
    # Required in case the Agent cannot resolve the cluster name through IMDS.
    clusterName: <CLUSTER_NAME>
    registry: <PRIVATE_EKS_REGISTRY_PATH>
    credentials:
      apiSecret:
        secretName: datadog-secret
        keyName: api-key
      appSecret:
        secretName: datadog-secret
        keyName: app-key
  features:
    apm:
      enabled: true
    logCollection:
      enabled: true
```

### Notes on the fields

| Field | Purpose |
|-------|---------|
| `clusterName` | Explicit cluster name when IMDS cannot resolve it |
| `registry` | Private EKS / ECR registry path for agent images (if required) |
| `apiSecret` / `appSecret` | References the secret created in Step 2 |
| `features.apm.enabled` | Enables Application Performance Monitoring |
| `features.logCollection.enabled` | Collects container / application logs |

---

## Step 4 – Apply the DatadogAgent manifest

```bash
kubectl apply -f /path/to/your/datadog-agent.yaml
```

(or, if the file is in the current directory)

```bash
kubectl apply -f datadog-agent.yaml
```

This creates the `DatadogAgent` custom resource. The Datadog Operator then deploys the agent DaemonSet and related components.

---

## Step 5 – Verify the Agent is running

```bash
kubectl get pods -n datadog-agent
kubectl get datadogagent -n datadog-agent
kubectl get daemonset -n datadog-agent
```

Expected:

- DatadogAgent resource shows as available / running
- Agent pods (DaemonSet) are `Running` on each node

---

## Step 6 – Confirm data appears in Datadog UI

1. Open Datadog → Infrastructure → Hosts / Containers / Pods
2. Filter by your cluster name
3. Verify:
   - Application pods
   - Argo CD pods
   - CPU / Memory metrics
   - Restart counts
   - Logs (because `logCollection` is enabled)

It can take 1–5 minutes for the first full scrape to appear.

---

## Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| Pods not visible | Check agent RBAC, secret keys, and `clusterName` |
| No metrics | Wait for scrape cycle; confirm Agent pods are Running |
| Image pull errors | Verify `registry` path and node IAM permissions for ECR |
| Namespace wrong | Re-run Step 1 |

See also: [Datadog Visibility Troubleshooting](../../docs/troubleshooting/datadog-visibility.md)
