#!/usr/bin/env bash
set -euo pipefail

# Deploy Kubernetes manifests
# Usage: ./scripts/deploy.sh [namespace]
# Prefer Argo CD GitOps in normal workflow; this is a manual helper.

NAMESPACE="${1:-employee-app}"
K8S_DIR="${K8S_DIR:-kubernetes}"

echo "==> Applying manifests to namespace: ${NAMESPACE}"

kubectl apply -f "${K8S_DIR}/namespace.yaml" || true
kubectl apply -f "${K8S_DIR}/configmap.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/secret.yaml"    -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/storage.yaml"   -n "${NAMESPACE}" 2>/dev/null || true
kubectl apply -f "${K8S_DIR}/deployment.yaml" -n "${NAMESPACE}"
kubectl apply -f "${K8S_DIR}/service.yaml"    -n "${NAMESPACE}"

echo "==> Waiting for rollout..."
kubectl rollout status deployment/employee-app -n "${NAMESPACE}" --timeout=120s || true

echo "==> Current pods:"
kubectl get pods -n "${NAMESPACE}"

echo "==> Deploy complete"
