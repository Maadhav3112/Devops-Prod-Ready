# Runbook: Database Connection Failure

**Component:** employee-app → MongoDB
**Category:** Application incident — dependency failure
**Related runbooks:** ALB / Target Group Health (`runbooks/alb-troubleshooting.md`)

---

## Problem

`employee-app` loses its connection to MongoDB and cannot serve requests
that depend on the database, even though the Pods themselves keep
running.

## Symptoms

- Readiness probe (`/health/ready`) starts failing, so the ALB/Service
  pulls the affected Pod(s) out of rotation
- Requests to the app return errors or hang for endpoints that touch the
  database
- `kubectl get pods` shows the Pod as `Running` but `READY 0/1` (not
  crash-looping — the process is alive, just not ready)
- Loki logs show a database connection error appearing in the app's
  output at the time the issue started

## Checks

```bash
# Confirm Pod readiness state
kubectl get pods -n employee-management-app

# Confirm which env vars the Pod is actually running with
kubectl exec -it <pod-name> -n employee-management-app -- printenv | grep MONGO_URI

# Tail the Pod's logs directly
kubectl logs -f <pod-name> -n employee-management-app
```

In Grafana → **Explore** → Loki data source, run:
```
{app="employee-app"} |= "error"
```
or narrow to the specific driver error:
```
{app="employee-app"} |= "MongoNetworkError"
```

## Investigation

**Controlled failure reproduced for this runbook:**
```bash
kubectl set env deployment/employee-app \
  MONGO_URI="mongodb://wrong-host:27017/test" \
  -n employee-management-app
```

This intentionally pointed the app at a non-existent Mongo host. Within
seconds:
- `kubectl get pods -w` showed the Pod flip from `1/1 Ready` to `0/1`
- The app's own logs (visible via `kubectl logs` and confirmed in Loki)
  showed a Mongo driver connection/timeout error, timestamped exactly
  when the env var was changed
- The readiness probe failure (not the liveness probe) is what pulled the
  Pod from traffic — the process itself never crashed or restarted,
  which is the expected, correct behavior: a Pod that can't reach its
  database shouldn't be killed and restarted (that wouldn't fix
  anything), it should just stop receiving traffic until the dependency
  is healthy again.

**Root cause (in this drill):** an incorrect `MONGO_URI` environment
variable, deliberately introduced. In a real incident, the same symptom
pattern (readiness fails, logs show a connection/auth/timeout error) also
covers: MongoDB Pod itself down or crash-looping, a network policy
blocking traffic between `employee-app` and `mongo`, MongoDB running out
of connections, or expired/incorrect credentials in the `Secret`.

## Resolution

For this drill, reverting the environment variable resolved it:
```bash
kubectl set env deployment/employee-app \
  MONGO_URI="mongodb://mongo-service:27017/employeedb" \
  -n employee-management-app
```

For a real incident, the fix depends on what the logs/checks point to:

| Root cause found | Fix |
|---|---|
| Wrong `MONGO_URI` / bad Secret value | Correct the `Secret`/`ConfigMap`, restart the Deployment if needed |
| Mongo Pod itself down | `kubectl describe pod <mongo-pod>` → investigate and restore Mongo |
| Network policy blocking traffic | Review/adjust `NetworkPolicy` rules between namespaces |
| Mongo connection pool exhausted | Scale Mongo resources or investigate connection leaks in the app |

## Verification

```bash
kubectl get pods -n employee-management-app -w
```
Confirm the Pod returns to `1/1 Ready`.

```bash
kubectl exec -it <mongo-pod> -n employee-management-app -- mongosh --eval "db.adminCommand('ping')"
```
Confirms Mongo itself is reachable and responsive.

In Grafana → Loki, re-run:
```
{app="employee-app"} |= "error"
```
Confirm no new error lines are appearing, and that a successful
connection/startup log line appears after the fix.

Finally, hit the readiness endpoint directly to confirm the app agrees:
```bash
kubectl exec -it <app-pod> -n employee-management-app -- wget -qO- http://localhost:3000/health/ready
```
Expect `200 OK` / `{"status":"ready"}`.

## Status

✅ Resolved and verified via controlled drill (deliberately broken
`MONGO_URI`, observed failure in `kubectl` + Loki, reverted, confirmed
recovery).

---

## Notes for the Final Architecture Document

- This is a good example for **Section 11 (Failure Engineering)** —
  specifically the "broken environment variable" failure type listed in
  the assignment.
- It also demonstrates **Section 8's** requirement to "correlate an
  application failure with its logs," since the Loki query pinpointed
  the exact failure window.
- Worth noting in **Section 4 (Kubernetes Hardening)** discussion: this
  incident is a clean illustration of why separating **readiness** from
  **liveness** matters — the correct behavior here was "stop routing
  traffic," not "restart the Pod," and the probes did exactly that.
