#!/usr/bin/env bash
set -euo pipefail

# Check application health and readiness endpoints
# Usage: ./scripts/health-check.sh [base_url]
# Example: ./scripts/health-check.sh http://localhost:8080

BASE_URL="${1:-http://localhost:8080}"

check() {
  local path="$1"
  local name="$2"
  echo -n "Checking ${name} (${BASE_URL}${path}) ... "
  if curl -sf --max-time 5 "${BASE_URL}${path}" > /dev/null; then
    echo "OK"
  else
    echo "FAILED"
    return 1
  fi
}

check "/health" "Liveness"
check "/ready"  "Readiness"

echo "Health checks passed"
