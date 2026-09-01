#!/usr/bin/env bash
# run-local.sh — Bring up the full stack locally with Docker Compose
# and wait until the app reports ready.
#
# Usage:
#   ./scripts/run-local.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

if [ ! -f .env ]; then
  echo "!! No .env file found. Copying .env.example -> .env"
  echo "!! Edit .env with real local credentials before continuing."
  cp .env.example .env
fi

echo "==> Starting containers"
docker compose up -d --build

echo "==> Waiting for app to report ready (max 60s)"
APP_PORT="$(grep -oP '(?<=- ")\d+(?=:3000)' docker-compose.yml | head -1)"
APP_PORT="${APP_PORT:-9500}"

for i in $(seq 1 30); do
  if curl -sf "http://localhost:${APP_PORT}/health/ready" >/dev/null 2>&1; then
    echo "==> App is ready on http://localhost:${APP_PORT}"
    curl -s "http://localhost:${APP_PORT}/health/ready" | tr ',' '\n'
    exit 0
  fi
  sleep 2
done

echo "!! App did not become ready in time. Recent logs:"
docker compose logs --tail=50
exit 1