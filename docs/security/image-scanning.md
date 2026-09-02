# Image & Dependency Scanning

## Tools & Checks in CI

| Stage | What is checked | Why |
|-------|-----------------|-----|
| Dependency scan | Known CVEs in application libraries | Catch vulnerable packages early |
| Secret detection | Accidental commit of keys, tokens, passwords | Prevent credential leaks |
| Static analysis | Basic code security / quality issues | Shift-left security |
| Container image scan | Vulnerabilities in the final OS + application layers | Ensure only clean images reach the registry |

## Pipeline Behaviour

- Critical / high severity findings can fail the pipeline
- Results are visible in the CI job logs
- Only images that pass the gates are pushed to the registry with version tags

## Example Flow

```text
Code → Test → Security Scan → Docker Build → Image Scan → Registry
```

If a critical vulnerability is detected:

1. Pipeline fails
2. Developer investigates the report
3. Dependency is upgraded or vulnerability is mitigated
4. Pipeline is re-run and passes

## Related Documents

- [CI/CD Architecture](../architecture/cicd-architecture.md)
- [Security Architecture](./security-architecture.md)
- [CI Pipeline Failure](../troubleshooting/ci-pipeline-failure.md)
