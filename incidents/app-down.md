# Incident 001 — Application Down

| Field | Detail |
|---|---|
| **Incident** | Application unreachable — Service selector mismatch |
| **Date** | [fill in run date] |
| **Severity** | High — full outage of the Employee Management API |
| **Symptoms** | Frontend/API unreachable from outside and inside the cluster; requests time out |
| **Impact** | 100% of users unable to reach the application for the duration of the incident |
| **Detection** | Failed synthetic curl to `/health`; Datadog uptime monitor alert |
| **Investigation** | `kubectl get endpoints employee-app-service` returned an empty endpoint list; `kubectl describe svc` showed a selector (`app=wrong-label`) that did not match any running pod's labels (`app=employee-app`) |
| **Root Cause** | Service selector was patched to a non-matching label during the controlled exercise, simulating a manifest drift/misconfiguration |
| **Resolution** | Service selector patched back to `app: employee-app` |
| **Verification** | `kubectl get endpoints` showed pod IPs populated again; `curl /health` returned `200 {"status":"ok"}` |
| **Preventive Action** | Service selectors are now validated by a CI `kubeval`/`kubeconform` step before manifests are applied; Argo CD diff review required before sync |
| **Lessons Learned** | A Service with zero endpoints is silent at the pod level — pods stay Running/Ready — so endpoint checks must be part of the standard first-response checklist, not just pod status |

---

## Reproduction steps

```bash
# Induce
kubectl patch svc employee-app-service -n employee-management-app \
  -p '{"spec":{"selector":{"app":"wrong-label"}}}'

# Investigate
kubectl get endpoints employee-app-service -n employee-management-app   # empty -> no matching pods
kubectl describe svc employee-app-service -n employee-management-app
kubectl get pods -n employee-management-app --show-labels
kubectl get events -n employee-management-app --sort-by=.lastTimestamp

# Fix
kubectl patch svc employee-app-service -n employee-management-app \
  -p '{"spec":{"selector":{"app":"employee-app"}}}'

# Verify
kubectl get endpoints employee-app-service -n employee-management-app
curl http://<node-ip>:<nodeport>/health
```

> **Evidence to attach:** before/after `kubectl get endpoints` output, and the recovered `curl /health` response.