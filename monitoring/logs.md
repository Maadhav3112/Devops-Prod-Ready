# Application Logging

## Approach

The application writes **structured JSON logs** to stdout/stderr.

Kubernetes captures these logs via the container runtime.  
Datadog (with log collection enabled) ships them to the Datadog Logs explorer.

## Example Log Lines

Observed via Argo CD log streaming and Datadog:

```json
{"timestamp":"2026-08-29T09:32:18.189Z","level":"info","message":"request received","method":"GET","path":"/health"}
{"timestamp":"2026-08-29T09:32:19.324Z","level":"info","message":"request received","method":"GET","path":"/health"}
```

## What Is Logged

| Event | Logged |
|-------|--------|
| Application startup | Yes |
| Incoming requests | Yes (method + path) |
| Errors | Yes |
| Shutdown | Yes |
| Health / readiness checks | Yes (visible as frequent `/health` calls) |

## How to View Logs

**kubectl**
```bash
kubectl logs -f deployment/<app-name> -n <namespace>
```

**Argo CD UI**  
Application → Pod → Logs tab

**Datadog**  
Logs → filter by service / pod / cluster

## Related Documents

- [Datadog Setup](./datadog/setup.md)
- [Application Architecture](../docs/architecture/application-architecture.md)
