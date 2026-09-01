#!/usr/bin/env bash
# deploy-k8s.sh — Apply all Kubernetes manifests in the correct order
# and wait for both deployments to become ready.
#
# Usage:
#   ./scripts/deploy-k8s.sh
#
# NOTE: kubernetes/Mongo-secrets.yml and App-secrets.yml in this repo
# currently contain real-looking plaintext credentials. Before applying
# in any shared environment, replace their values (or point this script
# at *-example files locally and inject real values via a secret
# manager / sealed-secrets / CI variable in real deployments).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
K8S_DIR="${REPO_ROOT}/kubernetes"
NAMESPACE="employee-management-app"

echo "==> Applying manifests in dependency order"

echo "--> 1/8 Namespace"
kubectl apply -f "${K8S_DIR}/Namespace.yml"

echo "--> 2/8 StorageClass"
kubectl apply -f "${K8S_DIR}/storage.yml"

echo "--> 3/8 Mongo Secret + PVC"
kubectl apply -f "${K8S_DIR}/Mongo-secrets.yml"
kubectl apply -f "${K8S_DIR}/mongo-pvc.yml"

echo "--> 4/8 Mongo Deployment + Service"
kubectl apply -f "${K8S_DIR}/Mongo-Deployemt.yml"
kubectl apply -f "${K8S_DIR}/mongo-service.yml"

echo "--> 5/8 Waiting for Mongo to be ready"
kubectl rollout status deployment/mongo -n "${NAMESPACE}" --timeout=120s

echo "--> 6/8 App ConfigMap + Secret"
kubectl apply -f "${K8S_DIR}/app-configmap.yml"
kubectl apply -f "${K8S_DIR}/App-secrets.yml"

echo "--> 7/8 App Deployment + Service"
kubectl apply -f "${K8S_DIR}/app-deployment.yml"
kubectl apply -f "${K8S_DIR}/app-service.yml"

echo "--> 8/8 Waiting for employee-app to be ready"
kubectl rollout status deployment/employee-app -n "${NAMESPACE}" --timeout=120s

echo
echo "==> Deployment complete. Current state:"
kubectl get all -n "${NAMESPACE}"

NODE_PORT=$(kubectl get svc employee-app-service -n "${NAMESPACE}" -o jsonpath='{.spec.ports[0].nodePort}')
echo
echo "App should be reachable at: http://<node-ip>:${NODE_PORT}/health"