#!/usr/bin/env bash
# build.sh — Build the employee-app and mongo images with version + latest tags.
#
# Usage:
#   ./scripts/build.sh [version]
#   ./scripts/build.sh v2.1
#
# If no version is given, it defaults to the version in application/package.json.

set -euo pipefail

REGISTRY_USER="${REGISTRY_USER:-raiden004}"
APP_IMAGE="${REGISTRY_USER}/employee-app"
MONGO_IMAGE="${REGISTRY_USER}/employee-mongo"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-$(node -p "require('${REPO_ROOT}/application/package.json').version" 2>/dev/null || echo "dev")}"

echo "==> Building images"
echo "    App image:   ${APP_IMAGE}:${VERSION} (+ :latest)"
echo "    Mongo image: ${MONGO_IMAGE}:${VERSION} (+ :latest)"
echo

echo "--> Building application image"
docker build \
  -t "${APP_IMAGE}:${VERSION}" \
  -t "${APP_IMAGE}:latest" \
  -f "${REPO_ROOT}/application/Dockerfile" \
  "${REPO_ROOT}/application"

echo "--> Building mongo image"
docker build \
  -t "${MONGO_IMAGE}:${VERSION}" \
  -t "${MONGO_IMAGE}:latest" \
  "${REPO_ROOT}/mongo-Dockerfile"

echo
echo "==> Build complete"
docker images | grep -E "${REGISTRY_USER}/employee-(app|mongo)" || true

echo
echo "Image sizes:"
docker image inspect "${APP_IMAGE}:${VERSION}" --format '  app:   {{.Size}} bytes' 2>/dev/null || true
docker image inspect "${MONGO_IMAGE}:${VERSION}" --format '  mongo: {{.Size}} bytes' 2>/dev/null || true