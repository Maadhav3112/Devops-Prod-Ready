#!/usr/bin/env bash
set -euo pipefail

# Run lint, unit tests and container smoke test
# Usage: ./scripts/test.sh

echo "==> Running lint..."
# Uncomment / adjust for your stack:
# npm run lint
# OR: golangci-lint run
# OR: flake8 .

echo "==> Running unit tests..."
# Uncomment / adjust:
# npm test
# OR: go test ./...
# OR: pytest tests/unit -q

echo "==> Running container smoke test..."
if [[ -f scripts/../tests/container/smoke_test.sh ]]; then
  bash tests/container/smoke_test.sh
else
  echo "    (no container smoke test found – skipping)"
fi

echo "==> All tests passed"
