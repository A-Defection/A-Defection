/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and adds user data to request.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and set user in request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'No authentication token, access denied'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Add user from payload
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found, token invalid'
      });
    }
    
    // Check if token is in blacklist (for logout functionality)
    if (user.tokenBlacklist && user.tokenBlacklist.includes(token)) {
      return res.status(401).json({
        status: 'error',
        message: 'Token invalid, please login again'
      });
    }
    
    // Set user and token in request
    req.user = user;
    req.token = token;
    
    // Add a helper to check for roles
    req.hasRole = (role) => {
      return user.roles.includes(role);
    };
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired, please login again',
        expired: true
      });
    }
    
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
};

/**
 * Middleware to authorize specific roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
}; 