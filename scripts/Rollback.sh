#!/usr/bin/env bash
# rollback.sh — Roll the employee-app Deployment back to the previous
# (or a specific) revision, for demonstrating Section 15 (Rollback Strategy).
#
# Usage:
#   ./scripts/rollback.sh              # roll back to previous revision
#   ./scripts/rollback.sh 3            # roll back to revision 3
#   ./scripts/rollback.sh --history    # just show revision history

set -euo pipefail

NAMESPACE="employee-management-app"
DEPLOYMENT="employee-app"

if [ "${1:-}" = "--history" ]; then
  echo "==> Rollout history for ${DEPLOYMENT}"
  kubectl rollout history deployment/"${DEPLOYMENT}" -n "${NAMESPACE}"
  exit 0
fi

echo "==> Current image before rollback:"
kubectl get deployment "${DEPLOYMENT}" -n "${NAMESPACE}" \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

if [ -n "${1:-}" ]; then
  echo "==> Rolling back to revision $1"
  kubectl rollout undo deployment/"${DEPLOYMENT}" -n "${NAMESPACE}" --to-revision="$1"
else
  echo "==> Rolling back to previous revision"
  kubectl rollout undo deployment/"${DEPLOYMENT}" -n "${NAMESPACE}"
fi

echo "==> Waiting for rollback to complete"
kubectl rollout status deployment/"${DEPLOYMENT}" -n "${NAMESPACE}" --timeout=120s

echo "==> Image after rollback:"
kubectl get deployment "${DEPLOYMENT}" -n "${NAMESPACE}" \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

echo "==> Pod status:"
kubectl get pods -n "${NAMESPACE}" -l app=employee-app