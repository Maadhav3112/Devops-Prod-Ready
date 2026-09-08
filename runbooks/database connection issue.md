# Runbook: Database Connection Failure

## Symptoms
- Application logs show repeated connection errors, e.g.:
  ```
  MongoDB connection attempt 1/10 failed: connect ECONNREFUSED <ip>:27017
  ```
- Application Pods restart repeatedly or never reach a ready state.
- `curl` to `/health/ready` returns `503` with `"db":"disconnected"`.

## Checks
1. Confirm the Mongo Pod itself is actually running:
   ```bash
   kubectl get pods -n employee-management-app -l app=mongo
   ```
2. If Mongo's Pod is stuck `Pending` (not `Running` at all), check its PersistentVolumeClaim:
   ```bash
   kubectl get pvc -n employee-management-app
   ```
3. If the PVC is stuck `Pending`, get the exact reason:
   ```bash
   kubectl describe pvc mongo-pvc -n employee-management-app
   ```
   Look at the **Events** section for messages like `binding volumes: context deadline exceeded` or
   `waiting for a volume to be created by the external provisioner`.

## Investigation / Diagnosis
In this environment, the root cause was a **StorageClass provisioner mismatch**. The PVC referenced a
StorageClass whose `provisioner` field pointed at `ebs.csi.eks.amazonaws.com` (EKS Auto Mode's
built-in storage provisioner, which requires a separate cluster-level `storage_config` capability that
was never enabled), while the actually-installed EBS CSI driver add-on used a different provisioner
name: `ebs.csi.aws.com`. Since the names didn't match, no volume was ever actually provisioned, so the
PVC stayed `Pending` indefinitely — and Mongo's Pod could never start without its required volume,
which meant the application had no database to connect to at all.

Check the StorageClass's actual provisioner:
```bash
kubectl get storageclass <name> -o yaml | grep provisioner
```

## Resolution
Two valid approaches were used at different points in this project, depending on time/cost
constraints:

**Option A — Fix the StorageClass to reference the correct provisioner:**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp2
provisioner: ebs.csi.aws.com     # matches the actually-installed driver
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```
Since `provisioner` is an immutable field, the broken StorageClass must be deleted and recreated
(not patched) — same for the PVC referencing it:
```bash
kubectl delete storageclass <broken-name>
kubectl apply -f kubernetes/storage.yml
kubectl delete pvc mongo-pvc -n employee-management-app
kubectl apply -f kubernetes/mongo-pvc.yml
```

**Option B — Remove the PVC dependency entirely (used when IRSA/CSI setup cost outweighed the
benefit for a learning environment):**
```yaml
volumes:
  - name: mongo-data
    emptyDir: {}
```
This trades away data persistence across Pod restarts in exchange for avoiding further
storage-provisioner debugging — a documented, deliberate trade-off, not an oversight.

## Verification
```bash
kubectl get pvc -n employee-management-app     # (if Option A) confirm STATUS: Bound
kubectl get pods -n employee-management-app    # confirm mongo Pod is Running
kubectl logs <app-pod-name> -n employee-management-app
```
Confirm the log line `MongoDB connected successfully` appears, and `/health/ready` returns `200`.

## Root Cause (for reference)
A StorageClass's `provisioner` field referenced a CSI driver name that was never actually active on
the cluster, so no underlying storage was ever created, leaving the database's PersistentVolumeClaim
permanently unfulfilled.