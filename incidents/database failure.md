# Incident 002 — Database Failure

| Field | Detail |
|---|---|
| **Incident** | Database unreachable — MongoDB deployment scaled to zero |
| **Date** | [fill in run date] |
| **Severity** | High — all database-dependent endpoints failing |
| **Symptoms** | Readiness probe failing (0/1 Ready); API returns 5xx on employee data endpoints |
| **Impact** | Read/write operations against employee records unavailable; health endpoint reports `db:disconnected` |
| **Detection** | Readiness probe failures visible in `kubectl get pods`; `MongoNetworkError` entries in application logs |
| **Investigation** | `kubectl get pods -l app=mongo` showed zero replicas; DNS resolution for `mongo-service` succeeded but connection was refused since no backing pod existed |
| **Root Cause** | MongoDB Deployment intentionally scaled to 0 replicas to simulate a database outage |
| **Resolution** | Scaled deployment back to 1 replica; `kubectl rollout status` confirmed the pod became Ready |
| **Verification** | `curl /health` returned `db:connected`; application successfully served existing employee records |
| **Preventive Action** | Alert added on `kube_deployment_status_replicas_available` for the mongo deployment; documented in `runbooks/database-failure.md` |
| **Lessons Learned** | Application-level errors (`MongoNetworkError`) surfaced before Kubernetes-level state was checked — logs and pod status should be checked in parallel, not sequentially, to reduce MTTR |

---

## Reproduction steps

```bash
# Induce
kubectl scale deployment mongo -n employee-management-app --replicas=0

# Investigate
kubectl get pods -n employee-management-app -l app=mongo
kubectl logs deployment/employee-app -n employee-management-app | grep -i mongo
kubectl exec -it <app-pod> -n employee-management-app -- printenv | grep MONGO
kubectl get svc mongo-service -n employee-management-app
nslookup mongo-service.employee-management-app.svc.cluster.local   # DNS check from a debug pod

# Recover
kubectl scale deployment mongo -n employee-management-app --replicas=1
kubectl rollout status deployment/mongo -n employee-management-app

# Verify
kubectl get pods -n employee-management-app -l app=mongo
curl http://<node-ip>:<nodeport>/health   # expect {"status":"ok","db":"connected"}
```

> **Evidence to attach:** `MongoNetworkError` entries in app logs during outage, and the connected health response after recovery.