#!/usr/bin/env bash
# cleanup.sh — Tear down local Docker Compose stack and/or the
# Kubernetes namespace. Use --keep-volumes to preserve Mongo data.
#
# Usage:
#   ./scripts/cleanup.sh compose            # docker compose down
#   ./scripts/cleanup.sh compose --volumes  # also remove named volume (wipes DB)
#   ./scripts/cleanup.sh k8s                # delete the whole namespace

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="employee-management-app"
TARGET="${1:-}"

case "${TARGET}" in
  compose)
    cd "${REPO_ROOT}"
    if [ "${2:-}" = "--volumes" ]; then
      echo "==> Stopping compose stack AND removing volumes (Mongo data will be lost)"
      docker compose down -v
    else
      echo "==> Stopping compose stack (Mongo data volume preserved)"
      docker compose down
    fi
    ;;
  k8s)
    echo "==> Deleting namespace ${NAMESPACE} (this removes everything in it, including PVCs)"
    read -p "Are you sure? [y/N] " confirm
    if [[ "${confirm}" =~ ^[Yy]$ ]]; then
      kubectl delete namespace "${NAMESPACE}"
    else
      echo "Cancelled."
    fi
    ;;
  *)
    echo "Usage: $0 {compose [--volumes]|k8s}"
    exit 1
    ;;
esac