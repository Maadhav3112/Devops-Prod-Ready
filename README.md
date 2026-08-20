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

## Running locally (without Docker)

Requires Node.js 18+ and a running MongoDB instance.

```bash
npm install
cp .env.example .env   # edit MONGO_URI if needed
npm start
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3000/api/employees`

## Environment variables

| Variable    | Description                          | Example                                  |
|-------------|---------------------------------------|-------------------------------------------|
| `PORT`      | Port the server listens on            | `3000`                                    |
| `MONGO_URI` | MongoDB connection string             | `mongodb://localhost:27017/employeedb`    |

See `.env.example`.

## API Endpoints

| Method | Endpoint              | Description              |
|--------|------------------------|---------------------------|
| GET    | `/`                    | Frontend (roster UI)      |
| GET    | `/api`                 | API info                  |
| GET    | `/health`              | Health check (for probes) |
| POST   | `/api/employees`       | Create an employee        |
| GET    | `/api/employees`       | List all employees        |
| GET    | `/api/employees/:id`   | Get one employee          |
| PUT    | `/api/employees/:id`   | Update an employee        |
| DELETE | `/api/employees/:id`   | Delete an employee        |

### Example: create an employee

```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","department":"Engineering","role":"Backend Developer","salary":75000}'
```

### Example: list employees

```bash
curl http://localhost:3000/api/employees
```
