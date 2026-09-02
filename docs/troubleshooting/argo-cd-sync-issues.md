# Troubleshooting: Argo CD Sync & Application Health Flapping

## Symptom

After initial GitOps setup, applications occasionally stayed in **OutOfSync** or **Progressing** state for a long time. Health status fluctuated.

## Investigation

- Compared the live cluster resources with the desired state in Git
- Checked image tags used by the Deployment
- Verified ConfigMap and Secret existence and names
- Inspected readiness probe configuration and pod events

## Root Cause

Combination of:

- Mismatched image tags between CI-produced images and Kubernetes manifests
- Missing or incorrectly named ConfigMap / Secret references
- Readiness probe timeouts that were too aggressive for cold starts

## Solution

1. Aligned image tags (CI pushes `v1.0` / `v2.0` → manifests reference the same tags)
2. Confirmed ConfigMap and Secret names matched the Deployment references
3. Tuned `initialDelaySeconds` and `timeoutSeconds` on the readiness probe
4. Forced a hard refresh / sync in the Argo CD UI

## Result

Subsequent upgrades (v1.0 → v2.0) synced cleanly. Application reported **Healthy** and **Synced**.

## Lessons Learned

- Image tag discipline is critical for GitOps
- Probe timing must account for application startup time
- Argo CD “Hard Refresh” is useful when manifests look correct but status is stale

## Related Documents

- [CI/CD Architecture](../architecture/cicd-architecture.md)
- [Rollback Guide](../deployment/rollback.md)
- [Controlled Failures](./controlled-failures.md)
