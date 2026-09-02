# Application Architecture

## Overview

The application is an **Employee Management Service** — a realistic small production-oriented backend that stores and serves employee records.

## Core Components

| Component | Responsibility |
|-----------|----------------|
| Backend / API | REST endpoints for employee CRUD |
| Database | Persistent storage of employee data |
| Configuration | Environment-based settings |
| Health endpoint | `/health` – overall process health |
| Readiness endpoint | Used by Kubernetes readiness probe |
| Liveness endpoint | Used by Kubernetes liveness probe |
| Logging | Structured JSON logs (startup, request, error, shutdown) |
| Error handling | Consistent error responses and logging |

## Functional Features

- List / search employees by name, department or role
- Create, update and delete employee records
- Salary, department and role fields
- Data survives container and pod restarts (via persistent volume)

## Configuration Management

All runtime settings are supplied via environment variables (or ConfigMap / Secret in Kubernetes).

Examples:

- Database connection string
- Log level
- Port
- Feature flags

No secrets are hard-coded in source or images.

## Health, Readiness & Liveness

| Endpoint | Purpose | Probe Type |
|----------|---------|------------|
| `/health` | Process is alive and responding | Liveness |
| `/ready`  | Application is ready to accept traffic (DB reachable, etc.) | Readiness |

Kubernetes uses these probes to:

- Restart unhealthy containers (liveness)
- Remove pods from Service endpoints until ready (readiness)

## Logging

Application emits structured JSON logs to stdout/stderr so they are captured by the container runtime and forwarded to Datadog / CloudWatch.

Example log lines observed in Argo CD:

```json
{"timestamp":"...","level":"info","message":"request received","method":"GET","path":"/health"}
```

## Versions

| Version | Description |
|---------|-------------|
| v1.0    | Baseline stable release |
| v2.0    | Upgraded release used to demonstrate GitOps sync and rollback |

## Related Documents

- [Container Architecture](./container-architecture.md)
- [Kubernetes Architecture](./kubernetes-architecture.md)
- [Secrets Management](../security/secrets-management.md)
