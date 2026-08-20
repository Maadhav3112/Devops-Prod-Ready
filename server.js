require('dotenv').config();
const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const employeeRoutes = require('./routes/employees');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check — used by Docker HEALTHCHECK and Kubernetes liveness/readiness probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/employees', employeeRoutes);

// Frontend — static roster UI served from /public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Employee Management API is running',
    endpoints: {
      health: 'GET /health',
      employees: 'GET|POST /api/employees',
      employeeById: 'GET|PUT|DELETE /api/employees/:id',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

// Only auto-start when run directly (`node server.js`), not when imported by tests.
if (require.main === module) {
  start();
}

module.exports = app;
