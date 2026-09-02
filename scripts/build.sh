#!/usr/bin/env bash
set -euo pipefail

# Build application and Docker image
# Usage: ./scripts/build.sh [tag]

TAG="${1:-latest}"
IMAGE_NAME="${IMAGE_NAME:-employee-app}"

echo "==> Building application..."
# Uncomment / adjust for your language stack:
# npm run build
# OR: mvn -q package -DskipTests
# OR: go build -o bin/app ./...

echo "==> Building Docker image: ${IMAGE_NAME}:${TAG}"
docker build -t "${IMAGE_NAME}:${TAG}" -t "${IMAGE_NAME}:latest" .

echo "==> Image built successfully"
docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
