# ALB Setup — Problems Faced & Solutions

**Project:** employee-management (EKS)
**Component:** AWS Application Load Balancer (manual setup)
**Date:** September 2026

---

## Overview

This document records the issues encountered while manually provisioning an AWS
Application Load Balancer (ALB) in front of an EKS-hosted Node.js application
(`employee-app`), and how each was diagnosed and resolved. Written in the
Symptoms → Checks → Commands/Actions → Diagnosis → Resolution → Verification
format used elsewhere in this project's runbooks.

---

## Problem 1: Target Group shows "Available instances (0)"

**Symptoms**
Creating a Target Group with target type **"Instances"** and trying to register
targets showed `Available instances (0)` — no EC2 instances were selectable,
even though `kubectl get nodes` showed 3 running nodes.

**Checks**
- Confirmed nodes were `Running` in EC2 console
- Confirmed cluster was on **EKS Auto Mode**

**Diagnosis**
EKS Auto Mode manages node lifecycle dynamically (Karpenter-style
provisioning). Nodes are not reliably selectable as standard EC2 instances in
the Target Group "Instances" picker, and instance IDs can change as Auto Mode
scales nodes up/down — making instance-based targeting fragile even if it had
worked.

**Resolution**
Abandoned target type "Instances." Switched to target type **"IP addresses"**
instead, registering Pod IPs directly (obtained via
`kubectl get pods -n employee-management-app -o wide`).

**Verification**
Target group accepted the manually entered Pod IPs (`10.0.1.20`, `10.0.1.22`)
without needing an instance picker.

---

## Problem 2: Wrong port used for health checks

**Symptoms**
Initial Target Group / Register Targets screen defaulted the health check port
field to `3000` while the target type was still "Instances."

**Checks**
Reviewed how NodePort-based routing works vs. direct Pod IP routing.

**Diagnosis**
Port `3000` is correct **only** when targeting Pod IPs directly (`target-type:
ip`). If using `target-type: instance`, the ALB hits the node's IP on a
**NodePort** (e.g. `31234`), and Kubernetes' `kube-proxy` routes internally to
port `3000` — using `3000` directly against a node IP would have failed.

**Resolution**
Since we moved to `target-type: ip`, port `3000` is correct as-is (matches the
Pod's actual listening port). No NodePort/Service type change was needed.

**Verification**
Confirmed via `kubectl get pods -o wide` that Pods listen on `3000`, matching
the Target Group's configured port.

---

## Problem 3: Confusion between `/health/live` and `/health/ready`

**Symptoms**
Uncertainty over which health endpoint the ALB Target Group should check, and
whether both `/health/live` and `/health/ready` needed to be added.

**Checks**
Reviewed the difference between Kubernetes liveness and readiness semantics.

**Diagnosis**
- `/health/ready` → answers "can this Pod serve traffic *right now*"
  (checks dependencies e.g. DB connectivity) — this is what the **ALB Target
  Group** and Kubernetes **readiness probe** should use.
- `/health/live` → answers "is the process alive" (minimal check) — this
  belongs **only** on the Kubernetes **liveness probe**, not the ALB. AWS
  Target Groups only support a single health check path per target group,
  so mixing both wasn't an option regardless.

**Resolution**
- ALB Target Group health check path set to `/health/ready` only.
- `/health/live` wired into the Deployment's `livenessProbe`, not the ALB.

**Verification**
`curl http://<pod-ip>:3000/health/ready` returned `200 OK` before ALB was even
involved, confirming the correct endpoint was chosen.

---

## Problem 4: ALB security group used `default` SG (no public inbound rule)

**Symptoms**
ALB creation wizard pre-selected the `default` security group, which does not
permit inbound traffic from the public internet.

**Checks**
Reviewed `default` SG's inbound rules — only allows traffic from within the
same security group, not `0.0.0.0/0`.

**Diagnosis**
An internet-facing ALB needs an SG with an explicit inbound rule for HTTP:80
from `0.0.0.0/0`. `default` does not provide this.

**Resolution**
Confirmed `employee-api-security-group` (`sg-004b1d98ddc121ef9`) already had
an inbound rule: HTTP, port 80, source `0.0.0.0/0`. Removed `default` and
`eks-cluster-sg-employee-management` from the ALB's attached SGs, keeping only
`employee-api-security-group` (least privilege — one clear SG whose purpose is
documented).

**Verification**
ALB reachable on port 80 externally (confirmed later via `curl`).

---

## Problem 5: Targets stuck in "Unhealthy" — ALB returned `504 Gateway Timeout`

**Symptoms**
- Target Group showed **2 targets, 0 healthy, 2 unhealthy** (after initially
  sitting in "Initial" state).
- `curl -v http://<alb-dns>/health/ready` returned:
  ```
  HTTP/1.1 504 Gateway Time-out
  ```

**Checks**
1. Confirmed ALB itself was reachable (TCP connection on port 80 succeeded,
   consistent with a 504 rather than connection refused/timeout at the ALB
   layer).
2. Confirmed `employee-api-security-group` (attached to the ALB) had a
   self-referencing rule for port 3000 — but this only helps if the **node**
   is also a member of that same SG.
3. Ran `aws ec2 describe-instances --instance-ids i-00618f5b1ef61d894
   --query "Reservations[].Instances[].SecurityGroups"` to see the node's
   actual attached SGs. EC2 console's per-instance "Security" tab did not
   render results (a known display quirk with EKS Auto Mode instances).
4. Found the node's actual SGs via **EC2 → Security Groups** filtered list:
   `eks-cluster-sg-employee-management-438721342` (`sg-015dfbbae50e8cbbf`) —
   the cluster-managed SG, separate from `employee-api-security-group`.
5. Inspected `sg-015dfbbae50e8cbbf`'s inbound rules: only one rule existed —
   "All traffic" self-referencing (described as "Allows EFA traffic"), used
   for internal cluster/control-plane communication. No rule permitted
   traffic from the ALB's SG.

**Diagnosis**
The ALB's security group (`employee-api-security-group`) was correctly open
to the internet on port 80, but the **EKS node's security group**
(`eks-cluster-sg-employee-management`) had no rule allowing inbound traffic on
port `3000` from the ALB's SG. The ALB could establish the TCP connection to
the node/Pod, but the node's SG silently dropped the traffic before it reached
the Pod — resulting in the ALB's health check (and any request) timing out
and returning a 504.

**Resolution**
Added an inbound rule to `eks-cluster-sg-employee-management`
(`sg-015dfbbae50e8cbbf`):
| Type | Port | Source |
|---|---|---|
| Custom TCP | 3000 | `employee-api-security-group` (`sg-004b1d98ddc121ef9`) |

**Verification**
- Target Group flipped both targets (`10.0.1.20`, `10.0.1.22`) to **healthy**
  within ~30 seconds of saving the rule.
- Re-ran `curl -v http://<alb-dns>/health/ready` →
  ```
  HTTP/1.1 200 OK
  Content-Type: application/json; charset=utf-8
  X-Powered-By: Express
  ```
  Confirmed reproducible on a second run.

---

## Summary — Root Cause Chain

The end-to-end root cause was a **two-hop security group gap**:

```
Internet → [ALB SG: employee-api-security-group]  ✅ port 80 open
              ↓
         ALB → Node/Pod on port 3000
              ↓
         [Node SG: eks-cluster-sg-employee-management]  ❌ port 3000 NOT allowed from ALB SG
```

Fixing required identifying that the **ALB and the EKS nodes sit behind two
different security groups**, not one shared SG — a detail obscured initially
because the ALB's own SG had a self-referencing rule that looked sufficient
but only applied to traffic *within that same SG*, not to the separate
cluster-managed SG actually attached to the nodes.

## Key Lessons / Talking Points for Architecture Doc

1. **EKS Auto Mode + `target-type: instance`** is fragile — node instance IDs
   are not stable, and the console's instance picker/Security tab can fail to
   populate. `target-type: ip` (direct Pod IP registration) is more reliable
   for this environment, at the cost of needing to re-register IPs manually
   whenever Pods reschedule (a gap the AWS Load Balancer Controller +
   Ingress would solve automatically).
2. **Two distinct SGs govern the request path** (ALB-facing vs.
   node/cluster-facing) — least-privilege network design means explicitly
   allowing only the necessary port (3000) from only the necessary source
   (the ALB's SG), rather than opening broadly.
3. **`/health/ready` vs `/health/live`** must be deliberately separated:
   readiness feeds the ALB and Service traffic decisions; liveness feeds only
   Kubernetes' restart decisions. A single Target Group can only check one
   path, reinforcing the need for one endpoint that reflects true traffic
   readiness.
4. **504 vs other error codes are diagnostic signals**: a 504 from
   `awselb/2.0` indicates the ALB itself is healthy and reachable, but got no
   response from the target — pointing straight at network/SG issues rather
   than DNS, listener config, or application code.