# Kubernetes Deployment Guide

## Prerequisites

- Access to the EKS cluster (`kubectl` configured)
- Container images already pushed to the registry
- Argo CD installed (recommended) **or** direct `kubectl apply`

## Option A – GitOps with Argo CD (Preferred)

1. Ensure manifests under `kubernetes/` are committed to Git
2. Create / update the Argo CD Application pointing at the Git path
3. Argo CD automatically syncs the desired state
4. Monitor health and sync status in the Argo CD UI

```bash
# Example – force a sync
argocd app sync <app-name>
argocd app get <app-name>
```

## Option B – Direct kubectl apply

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secret.yaml
kubectl apply -f kubernetes/storage.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl apply -f kubernetes/service.yaml
```

## Verify

```bash
kubectl get pods -n <namespace>
kubectl get svc -n <namespace>
kubectl logs -f deployment/<app-name> -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
```

## Health Checks

- Liveness probe → restarts unhealthy containers
- Readiness probe → removes unready pods from the Service

## Related Documents

- [Kubernetes Architecture](../architecture/kubernetes-architecture.md)
- [Rollback Guide](./rollback.md)
- [Argo CD Sync Issues](../troubleshooting/argo-cd-sync-issues.md)
