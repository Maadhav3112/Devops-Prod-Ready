require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const roleRoutes = require('./routes/roles');
const { errorHandler } = require('./middleware/errorHandler');

// Fail fast if required env vars are missing — better to crash at startup
// than fail mysteriously on the first request.
const requiredEnvVars = ['MONGO_URI'];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  logger.error('Missing required environment variables', { missing });
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Basic request logging
app.use((req, res, next) => {
  logger.info('Request received', { method: req.method, path: req.originalUrl });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Employee Management API is running',
    version: process.env.APP_VERSION || 'v2',
    endpoints: {
      health: 'GET /health',
      liveness: 'GET /health/live',
      readiness: 'GET /health/ready',
      employees: 'GET|POST /api/employees (supports ?search=&department=&role=&status=)',
      employeeById: 'GET|PUT|DELETE /api/employees/:id',
      employeeStats: 'GET /api/employees/stats',
      employeeExport: 'GET /api/employees/export',
      employeeResetDemo: 'DELETE /api/employees/reset-demo',
      departments: 'GET|POST /api/departments, DELETE /api/departments/:id, POST /api/departments/sync',
      roles: 'GET|POST /api/roles, DELETE /api/roles/:id, POST /api/roles/sync',
    },
  });
});

// Liveness — "is the process alive?" Always returns 200 if Express is running.
// Kubernetes uses this to decide whether to RESTART the container.
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness — "can this instance actually serve traffic right now?"
// Checks the real dependency (MongoDB). Kubernetes uses this to decide
// whether to SEND TRAFFIC to this Pod — a live-but-not-ready Pod gets
// removed from the Service's rotation without being restarted.
app.get('/health/ready', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  if (dbState === 1) {
    res.status(200).json({ status: 'ready', db: 'connected' });
  } else {
    res.status(503).json({ status: 'not ready', db: 'disconnected' });
  }
});

// Kept for backward compatibility with Day 1/2 setup (Docker HEALTHCHECK, etc.)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: process.env.APP_VERSION || 'v2' });
});

app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/roles', roleRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Centralized error handler — must be registered last
app.use(errorHandler);

let server;

async function start() {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      logger.info('Server started', { port: PORT });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

// Graceful shutdown — finish in-flight requests before exiting,
// and close the DB connection cleanly. Matters for Kubernetes,
// which sends SIGTERM before killing a Pod during scaling/rollout.
function shutdown(signal) {
  logger.info('Shutdown signal received', { signal });
  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      logger.info('Server closed gracefully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  start();
}

module.exports = app;