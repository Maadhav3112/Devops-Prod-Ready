# Employee Management API

A small REST API — with a lightweight web UI on top — for managing employee
records. Built as the base application for a DevOps assignment
(containerization, Kubernetes deployment, CI/CD).

## What it does

Basic CRUD for employee records: create, list, view, update, and delete
employees, backed by MongoDB. A static frontend (`/public`) is served
directly from the same Express app, so there's nothing extra to deploy or
run separately.

## Technology used

- **Node.js + Express** — HTTP server / routing, and static file serving
- **MongoDB + Mongoose** — data storage and schema validation
- **dotenv** — environment variable loading
- **HTML / CSS / vanilla JS** — the frontend (`/public`), no build step required
- **Docker + Docker Compose** — containerized app and database

## Running locally

### Option 1: Docker Compose (recommended)

Spins up the app and a MongoDB container together.

```bash
cp .env.example .env   # set MONGO_ROOT_USER / MONGO_ROOT_PASSWORD
docker compose -f Docker-compose.yml up --build
```

- Frontend: `http://localhost:9500`
- API: `http://localhost:9500/api/employees`
- MongoDB (if you need direct access): `localhost:20000`

Stop everything with:

```bash
docker compose -f Docker-compose.yml down
```

> The app image is built with `COPY . .`, so it bakes in a snapshot of the
> source. If you edit files like `public/script.js`, re-run with `--build`
> (or `docker compose up --build`) — a plain `up` will keep serving the old
> code from the existing image.

### Option 2: Node.js directly (no Docker)

Requires Node.js 18+ and a running MongoDB instance you can connect to.

```bash
npm install
cp .env.example .env   # edit MONGO_URI to point at your MongoDB instance
npm start
```

For auto-restart during development:

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3000/api/employees`

### Running tests

```bash
npm test
```

## Environment variables

| Variable              | Description                              | Example                                                              |
|------------------------|--------------------------------------------|------------------------------------------------------------------------|
| `PORT`                 | Port the server listens on                | `3000`                                                                  |
| `MONGO_ROOT_USER`      | MongoDB root username (Docker Compose)    | `admin`                                                                 |
| `MONGO_ROOT_PASSWORD`  | MongoDB root password (Docker Compose)    | `password`                                                              |
| `MONGO_URI`            | Full MongoDB connection string            | `mongodb://admin:password@localhost:27017/employeedb?authSource=admin` |

See `.env.example` for details, including the connection string format for
Docker Compose (`mongo` as hostname) vs. running directly on your machine
(`localhost`).

## Available API endpoints

| Method | Endpoint              | Description                |
|--------|------------------------|------------------------------|
| GET    | `/`                    | Frontend (roster UI)        |
| GET    | `/api`                 | API info                    |
| GET    | `/health`              | Health check (for probes)   |
| POST   | `/api/employees`       | Create an employee          |
| GET    | `/api/employees`       | List all employees          |
| GET    | `/api/employees/:id`   | Get one employee             |
| PUT    | `/api/employees/:id`   | Update an employee          |
| DELETE | `/api/employees/:id`   | Delete an employee          |

All responses follow the shape `{ success: boolean, data?: ..., error?: string }`.

### Employee fields

| Field        | Type   | Required | Notes                        |
|--------------|--------|----------|--------------------------------|
| `name`       | String | Yes      |                                 |
| `email`      | String | Yes      | Must be unique                 |
| `department` | String | Yes      |                                 |
| `role`       | String | No       | Defaults to `"Employee"`       |
| `salary`     | Number | No       | Defaults to `0`, must be ≥ 0   |

`createdAt` / `updatedAt` timestamps are added automatically.

### Example: create an employee

```bash
curl -X POST http://localhost:9500/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","department":"Engineering","role":"Backend Developer","salary":75000}'
```

### Example: list employees

```bash
curl http://localhost:9500/api/employees
```

## API testing evidence

The sequence below exercises every endpoint end-to-end against a running
container (`http://localhost:9500`). Run in order — the `_id` returned by
the create step is reused in the following requests.

**1. Health check**

```bash
curl -i http://localhost:9500/health
```

**2. Create an employee**

```bash
curl -i -X POST http://localhost:9500/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","department":"Engineering","role":"Backend Developer","salary":75000}'
```

Copy the `_id` from the response for the next steps.

**3. List all employees**

```bash
curl -i http://localhost:9500/api/employees
```

**4. Get one employee by ID**

```bash
curl -i http://localhost:9500/api/employees/PASTE_ID_HERE
```

**5. Update the employee**

```bash
curl -i -X PUT http://localhost:9500/api/employees/PASTE_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{"salary":82000, "role":"Senior Backend Developer"}'
```

**6. Delete the employee**

```bash
curl -i -X DELETE http://localhost:9500/api/employees/PASTE_ID_HERE
```

**7. Confirm the delete** (list again — record should be gone)

```bash
curl -i http://localhost:9500/api/employees
```

The `-i` flag prints response headers and status codes (200/201/404, etc.)
alongside the JSON body, which is the part worth capturing in screenshots.