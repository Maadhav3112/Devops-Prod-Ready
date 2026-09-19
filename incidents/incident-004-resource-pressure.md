# Incident 004: Node Memory Pressure from Uneven Pod Scheduling

**Date:** 2026-09-07
**Severity:** Medium (degraded performance across ArgoCD, monitoring, and application components)

## Symptoms
- ArgoCD's UI and CLI felt noticeably slow to respond.
- Grafana repeatedly restarted (`2/3 Ready`, climbing restart count).
- `argocd-repo-server` showed unexpected restarts.

## Impact
- Degraded responsiveness across ArgoCD, Grafana, and general cluster operations. No full outage, but
  operational tooling became unreliable.

## Detection
Manually observed slowness while using ArgoCD and Grafana; confirmed via direct resource inspection
rather than an automated alert (no alerting rules were configured for this condition at the time).

## Investigation
1. Checked node-level resource usage:
   ```bash
   kubectl top nodes
   ```
   Result:
   ```
   NAME                  CPU(%)   MEMORY(%)
   i-00618f5b1ef61d894   46%      83%
   i-01814f93ea176cf6c   0%       11%
   i-0667b0039242ff0e1   1%       11%
   ```
   One node was under significant memory pressure while two others sat nearly idle.
2. Identified exactly what was running on the overloaded node:
   ```bash
   kubectl get pods -A -o wide --field-selector spec.nodeName=i-00618f5b1ef61d894
   ```
   Found **all 16 Pods** from ArgoCD (7), the application (3), and the entire Prometheus/Grafana stack
   (6) scheduled onto this single node, while the other two nodes hosted nothing beyond system Pods.

## Root Cause
Pods from three separate Helm/manifest installs (ArgoCD, Prometheus stack, application) had all been
scheduled onto the same node — likely because they were created in bursts before the other two nodes
were fully `Ready` and available for scheduling. Kubernetes does not automatically rebalance
already-running Pods after the fact; it only makes placement decisions at scheduling time.

## Resolution
1. Reduced Prometheus/Grafana's resource footprint and metric retention window:
   ```bash
   helm upgrade kube-prometheus-stack prometheus-community/kube-prometheus-stack \
     --namespace monitoring --reuse-values \
     --set prometheus.prometheusSpec.resources.requests.memory=256Mi \
     --set prometheus.prometheusSpec.resources.limits.memory=512Mi \
     --set prometheus.prometheusSpec.retention=6h \
     --set grafana.resources.requests.memory=128Mi \
     --set grafana.resources.limits.memory=256Mi
   ```
2. Forced Pods to be rescheduled, giving the scheduler a fresh chance to distribute them:
   ```bash
   kubectl rollout restart deployment -n monitoring
   kubectl delete pod -n monitoring -l app.kubernetes.io/name=prometheus
   kubectl delete pod -n monitoring -l app.kubernetes.io/name=alertmanager
   kubectl rollout restart deployment employee-app -n employee-management-app
   kubectl delete pod argocd-repo-server-<hash> -n argocd
   kubectl delete pod argocd-server-<hash> -n argocd
   ```

## Verification
```bash
kubectl get pods -A -o wide -w
kubectl top nodes
```
Confirmed Pods redistributed across all three nodes, and node memory usage dropped to a more even
spread (no single node above roughly 50%).

## Preventive Action
- Consider adding Pod anti-affinity rules or topology spread constraints for critical components in a
  production-equivalent setup, so the scheduler is explicitly instructed to spread replicas across
  nodes rather than relying on incidental timing.
- Resource requests/limits should be set proactively for every Helm-installed component before first
  install, not reactively after observing pressure.

## Lessons Learned
Kubernetes' scheduler optimizes for placement decisions at Pod-creation time only; it does not
continuously rebalance a cluster. Installing several substantial components (a GitOps controller, a
full monitoring stack, and an application) in quick succession on a small node pool can result in
severe imbalance purely due to timing, even when total cluster capacity is more than sufficient.
