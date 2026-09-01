#!/usr/bin/env bash
# push.sh — Push the built app + mongo images to Docker Hub.
#
# Usage:
#   ./scripts/push.sh [version]
#
# Assumes you're already logged in (docker login), or will prompt you to.

set -euo pipefail

REGISTRY_USER="${REGISTRY_USER:-raiden004}"
APP_IMAGE="${REGISTRY_USER}/employee-app"
MONGO_IMAGE="${REGISTRY_USER}/employee-mongo"
VERSION="${1:-latest}"

if ! docker info 2>/dev/null | grep -q "Username"; then
  echo "==> Not logged in to Docker Hub. Logging in..."
  docker login
fi

for IMAGE in "${APP_IMAGE}" "${MONGO_IMAGE}"; do
  echo "--> Pushing ${IMAGE}:${VERSION}"
  docker push "${IMAGE}:${VERSION}"

  echo "--> Pushing ${IMAGE}:latest"
  docker push "${IMAGE}:latest"
done

echo
echo "==> Push complete. Verify with:"
echo "    docker pull ${APP_IMAGE}:${VERSION}"
echo "    docker pull ${MONGO_IMAGE}:${VERSION}"