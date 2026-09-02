# Troubleshooting: Datadog Agent & Metric Visibility Gaps

## Symptom

After installing the Datadog agent, some Pods and namespaces did not appear in the Infrastructure view. Custom metrics and resource utilization data were missing or delayed.

## Investigation

- Checked DaemonSet status of the Datadog agent
- Reviewed agent logs
- Examined RBAC permissions of the agent service account
- Verified API key and site configuration

## Root Cause

1. Incomplete cluster-agent / node-agent configuration
2. Missing ClusterRole permissions for the agent service account
3. Normal delay in the first full scrape cycle

## Solution

1. Verified the Datadog agent DaemonSet was running on all nodes
2. Granted the required ClusterRole / ClusterRoleBinding permissions
3. Confirmed API key and Datadog site settings
4. Waited for a full scrape cycle after the configuration changes

## Result

All Pods (application, Argo CD components, observability controllers, etc.) appeared with accurate CPU, memory and restart metrics. Dashboards became usable for the “Deploy → Observe → Detect → Investigate” workflow.

## Lessons Learned

- Datadog agent needs proper RBAC to discover cluster resources
- First metrics can take a few minutes to appear
- Always validate agent status before assuming a metrics problem

## Related Documents

- [Observability notes in architecture overview](../architecture/overview.md)
- [Kubernetes Architecture](../architecture/kubernetes-architecture.md)
