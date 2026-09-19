# Incident 002: Database Connection Failure — PVC Stuck Pending

**Date:** 2026-08-29
**Severity:** High (application Pods crash-looping, no working database)

## Symptoms
- Application Pods repeatedly restarted with `CrashLoopBackOff`.
- Application logs showed a repeating connection failure:
  ```
  MongoDB connection attempt 1/10 failed: connect ECONNREFUSED 172.20.111.73:27017
  ```
- MongoDB's own Pod was stuck in `Pending` status, never reaching `Running`.

## Impact
- No employee records could be created, read, updated, or deleted.
- Application was effectively non-functional for the duration of the incident.

## Detection
Observed via `kubectl get pods`, showing the application Pods in `CrashLoopBackOff` and the Mongo
Pod stuck `Pending` after an ArgoCD sync of updated Kubernetes manifests.

## Investigation
1. Checked the Mongo Pod's status and events:
   ```bash
   kubectl describe pod <mongo-pod> -n employee-management-app
   ```
   Events showed `FailedScheduling: 0/3 nodes are available` (a stale message from an earlier taint
   issue) followed by the actual current blocker: `running PreBind plugin "VolumeBinding": binding
   volumes: context deadline exceeded`.
2. Checked the PersistentVolumeClaim directly:
   ```bash
   kubectl get pvc -n employee-management-app
   kubectl describe pvc mongo-pvc -n employee-management-app
   ```
   Status: `Pending`, with the event `Waiting for a volume to be created either by the external
   provisioner 'ebs.csi.eks.amazonaws.com'... please verify that the provisioner is running`.
3. Checked the StorageClass referenced by the PVC:
   ```bash
   kubectl get storageclass gp2 -o yaml | grep provisioner
   ```
   Found `provisioner: ebs.csi.eks.amazonaws.com` — this is **EKS Auto Mode's own built-in storage
   provisioner**, which only functions if the cluster's `storage_config` capability was explicitly
   enabled at cluster-creation time. This cluster was built via a plain-resource Terraform
   configuration (not the EKS module), and this capability was never enabled.
4. Confirmed a *different* EBS CSI driver add-on was separately installed
   (`aws-ebs-csi-driver`, using provisioner `ebs.csi.aws.com`) — a mismatch between what the
   StorageClass referenced and what was actually active on the cluster.

## Root Cause
The `gp2` StorageClass's `provisioner` field referenced `ebs.csi.eks.amazonaws.com` (EKS Auto Mode's
native provisioner, inactive on this cluster), while the actually-installed CSI driver used
`ebs.csi.aws.com`. Since these are different provisioner names, no component in the cluster was ever
watching for or fulfilling the PVC's request, so it remained `Pending` indefinitely — and MongoDB's
Pod could never start without its required volume.

## Resolution
Given time constraints and the additional IRSA (IAM Roles for Service Accounts) complexity required
to fully wire the EBS CSI driver's permissions, a decision was made to switch MongoDB's storage from
a PersistentVolumeClaim to `emptyDir`:
```yaml
volumes:
  - name: mongo-data
    emptyDir: {}
```
This was a deliberate, documented trade-off — Mongo no longer depends on any external storage
provisioner at all, at the cost of data not surviving Pod restarts.

## Verification
```bash
kubectl get pods -n employee-management-app
```
Mongo Pod moved to `Running`. Application Pods reconnected successfully:
```bash
kubectl logs <app-pod> -n employee-management-app
```
Showed `MongoDB connected successfully` instead of repeated connection failures.

## Preventive Action
- A `mongodump`/`mongorestore`-based backup strategy to S3 was implemented separately, so the
  `emptyDir` trade-off does not mean data is unprotected — it protects at the application/database
  layer rather than the Kubernetes volume layer.
- Fixing the underlying StorageClass/provisioner mismatch (and completing IRSA setup for the EBS CSI
  driver) is tracked as an open production-readiness gap.

## Lessons Learned
A StorageClass's `provisioner` field must exactly match an actually-running, correctly-permissioned
CSI driver — a plausible-looking but inactive provisioner name fails silently (the PVC simply never
binds) rather than producing an obvious error, making this a genuinely difficult class of bug to
diagnose without checking each layer (Pod → PVC → StorageClass → CSI driver) individually.
