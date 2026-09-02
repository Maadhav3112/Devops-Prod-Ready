# Tests

This folder contains all automated tests used by local development and the CI pipeline.

## Structure

```text
tests/
├── README.md
├── unit/              # Application unit tests
├── integration/       # Optional API + database tests
└── container/         # Smoke tests run after Docker image build
    └── smoke_test.sh
```

## CI Pipeline Stages

| Stage | What runs |
|-------|-----------|
| Lint | Code style / static checks |
| Unit Tests | Tests under `tests/unit/` |
| Container Test | `tests/container/smoke_test.sh` (after image build) |

## Run locally

```bash
# Unit tests (adjust for your stack)
# npm test
# go test ./...
# pytest tests/unit -q

# Container smoke test (image must exist)
./tests/container/smoke_test.sh

# Or via helper script
./scripts/test.sh
```

## Notes

- Unit tests must pass for the CI pipeline to continue
- Container smoke test verifies the built image starts and responds on `/health`
- Do not put real production credentials in any test
