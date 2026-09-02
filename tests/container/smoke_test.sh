#!/usr/bin/env bash
set -euo pipefail

# Container smoke test – run after Docker image is built
# Usage: ./tests/container/smoke_test.sh [image]
# Example: ./tests/container/smoke_test.sh employee-app:latest

IMAGE="${1:-employee-app:latest}"
CONTAINER_NAME="employee-app-smoke-$$"
PORT="${SMOKE_PORT:-8080}"

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Starting container from image: ${IMAGE}"
docker run -d --name "${CONTAINER_NAME}" -p "${PORT}:${PORT}" "${IMAGE}"

echo "==> Waiting for application to become ready..."
for i in $(seq 1 30); do
  if curl -sf --max-time 2 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "==> Health check passed"
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "==> ERROR: health check failed after 30 attempts"
    docker logs "${CONTAINER_NAME}" || true
    exit 1
  fi
  sleep 1
done

# Optional readiness check
if curl -sf --max-time 2 "http://127.0.0.1:${PORT}/ready" >/dev/null 2>&1; then
  echo "==> Readiness check passed"
else
  echo "==> Readiness endpoint not available or not ready (non-fatal for smoke test)"
fi

echo "==> Container smoke test passed"
