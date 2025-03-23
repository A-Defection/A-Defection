/**
 * Custom error response class
 */
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Error Handler Middleware
 * 
 * Centralizes error handling for all API routes
 */

/**
 * Express error handler
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
exports.errorHandler = (err, req, res, next) => {
  // Default status code and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong on the server';
  
  // Log the error
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  
  // Handle specific error types
  
  // MongoDB validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    
    // Format validation errors
    const errorMessages = Object.values(err.errors).map(e => e.message);
    message = 'Validation failed: ' + errorMessages.join(', ');
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    
    // Extract field name from the error message
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for ${field}`;
  }
  
  // JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // Cast errors (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  
  // Send response
  res.status(statusCode).json({
    status: 'error',
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = {
  ErrorResponse,
  errorHandler,
}; 