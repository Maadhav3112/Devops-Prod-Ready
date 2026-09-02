#!/usr/bin/env bash
set -euo pipefail

# Create application namespace
# Usage: ./scripts/setup/create-namespace.sh [namespace]

NAMESPACE="${1:-employee-app}"

echo "==> Creating namespace: ${NAMESPACE}"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
echo "==> Namespace ready"
kubectl get namespace "${NAMESPACE}"
