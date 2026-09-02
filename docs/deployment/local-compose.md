# Local Deployment with Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Repository cloned
- `.env` file prepared (never commit real secrets)

## Start the Stack

```bash
docker compose up -d --build
```

This starts:

- Application container
- Database container
- Shared Docker network
- Named volume for database data

## Verify

```bash
docker compose ps
docker compose logs -f app
curl http://localhost:<port>/health
```

## Data Persistence

Database data is stored on a Docker volume. Stopping and restarting the containers does **not** lose data.

```bash
docker compose down          # data kept
docker compose down -v       # data removed (volume deleted)
```

## Stop

```bash
docker compose down
```

## Related Documents

- [Container Architecture](../architecture/container-architecture.md)
- [Environment Configuration](./environment-config.md)
