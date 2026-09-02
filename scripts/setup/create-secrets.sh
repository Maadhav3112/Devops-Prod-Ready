#!/usr/bin/env bash
set -euo pipefail

# Create ConfigMap and Secret from environment variables
# Usage: source .env && ./scripts/setup/create-secrets.sh [namespace]
# Never commit real production secrets.

NAMESPACE="${1:-employee-app}"

echo "==> Creating ConfigMap and Secret in namespace: ${NAMESPACE}"

# Non-sensitive configuration
kubectl create configmap employee-app-config \
  --from-literal=LOG_LEVEL="${LOG_LEVEL:-info}" \
  --from-literal=PORT="${PORT:-8080}" \
  -n "${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Sensitive values (must be set in environment / .env)
: "${DB_PASSWORD:?DB_PASSWORD must be set}"
kubectl create secret generic employee-app-secret \
  --from-literal=DB_PASSWORD="${DB_PASSWORD}" \
  --from-literal=DB_USER="${DB_USER:-app}" \
  -n "${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> ConfigMap and Secret created"
kubectl get configmap,secret -n "${NAMESPACE}" | grep employee-app || true
