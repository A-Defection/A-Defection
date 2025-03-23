/**
 * Rate Limiter Middleware
 * 
 * Limits the number of requests from a single IP address
 * to prevent abuse and DOS attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * Create a rate limiter middleware
 * @param {number} max - Maximum number of requests allowed in the specified window
 * @param {number} windowMinutes - Time window in minutes
 * @returns {function} Express middleware
 */
exports.rateLimiter = (max = 60, windowMinutes = 15) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000, // Convert minutes to milliseconds
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      status: 'error',
      message: `Too many requests, please try again after ${windowMinutes} minutes`,
      rateLimitInfo: {
        maxRequests: max,
        windowMinutes: windowMinutes
      }
    },
    skip: (req) => {
      // Skip rate limiting for certain paths if needed
      // e.g., return req.path.startsWith('/public');
      return false;
    }
  });
}; 