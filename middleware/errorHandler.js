// middleware/errorHandler.js
const logger = require('../config/logger');

// Custom error class so routes can throw errors with an explicit status code
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes expected errors from bugs
  }
}

// Express error-handling middleware — must have 4 params for Express to recognize it
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  logger.error(err.message, {
    statusCode,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal server error' : err.message,
  });
}

// Catches errors in async route handlers without needing try/catch everywhere
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { AppError, errorHandler, asyncHandler };