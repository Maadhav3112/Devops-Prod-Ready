# Rollback Strategy

## Goal

Be able to return to a previous known-good version quickly when a new release misbehaves.

## Version History Demonstrated

| Version | Description |
|---------|-------------|
| v1.0    | Baseline stable release |
| v2.0    | Upgraded release (used to demonstrate upgrade + rollback) |

## Rollback via Git + Argo CD (Recommended)

1. Identify the last good commit / tag in Git
2. Revert the repository to that revision (or create a new commit that restores the previous manifests / image tag)
3. Argo CD detects the change and syncs the cluster back to the previous state

```bash
# Example using Argo CD history
argocd app history <app-name>
argocd app rollback <app-name> <history-id>
```

## Rollback via Image Tag

1. Change the image tag in `deployment.yaml` back to the previous version (e.g. `v1.0`)
2. Commit and push
3. Argo CD (or `kubectl apply`) deploys the previous image

## Observations from the v1 → v2 Exercise

- Argo CD correctly detected the new revision
- After sync the application reported Healthy / Synced
- Rolling back restored the previous behaviour without manual pod deletion

## Related Documents

- [CI/CD Architecture](../architecture/cicd-architecture.md)
- [Argo CD Sync Issues](../troubleshooting/argo-cd-sync-issues.md)
- [Controlled Failures](../troubleshooting/controlled-failures.md)
