#!/usr/bin/env bash
# health-check.sh — Hit /health, /health/live, /health/ready and print
# pod/container status. Useful for Section 12/13 (Observability & Dashboard)
# evidence and for a quick sanity check after any deploy.
#
# Usage:
#   ./scripts/health-check.sh                       # defaults to localhost:9500 (compose)
#   BASE_URL=http://<node-ip>:30950 ./scripts/health-check.sh   # against k8s

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:9500}"
NAMESPACE="employee-management-app"

echo "==> Checking endpoints at ${BASE_URL}"
for path in "/health" "/health/live" "/health/ready" "/api"; do
  echo
  echo "--> GET ${path}"
  code=$(curl -s -o /tmp/health_body.json -w "%{http_code}" "${BASE_URL}${path}" || echo "000")
  echo "    HTTP ${code}"
  cat /tmp/health_body.json 2>/dev/null | sed 's/^/    /'
done

echo
echo "==> Kubernetes pod status (if kubectl/cluster available)"
if kubectl get ns "${NAMESPACE}" >/dev/null 2>&1; then
  kubectl get pods -n "${NAMESPACE}" -o wide
  echo
  echo "--> Restart counts:"
  kubectl get pods -n "${NAMESPACE}" \
    -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount,READY:.status.containerStatuses[0].ready
  echo
  echo "--> Resource usage (requires metrics-server):"
  kubectl top pods -n "${NAMESPACE}" 2>/dev/null || echo "    metrics-server not available"
else
  echo "    (no ${NAMESPACE} namespace found — skipping k8s checks)"
fi

rm -f /tmp/health_body.json