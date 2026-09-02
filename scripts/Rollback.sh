#!/usr/bin/env bash
set -euo pipefail

# Rollback application to a previous image tag
# Usage: ./scripts/rollback.sh <tag> [namespace]
# Example: ./scripts/rollback.sh v1.0

TAG="${1:?Usage: $0 <tag> [namespace]}"
NAMESPACE="${2:-employee-app}"
DEPLOYMENT="${DEPLOYMENT:-employee-app}"
IMAGE_NAME="${IMAGE_NAME:-employee-app}"

echo "==> Rolling back ${DEPLOYMENT} to image tag: ${TAG}"

kubectl set image deployment/"${DEPLOYMENT}" \
  "${DEPLOYMENT}=${IMAGE_NAME}:${TAG}" \
  -n "${NAMESPACE}"

echo "==> Waiting for rollout..."
kubectl rollout status deployment/"${DEPLOYMENT}" -n "${NAMESPACE}" --timeout=120s

echo "==> Rollback complete"
kubectl get pods -n "${NAMESPACE}"
