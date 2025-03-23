/**
 * Role Checking Middleware
 * 
 * Checks if a user has the required role(s) to access a route
 */

/**
 * Check if the authenticated user has any of the specified roles
 * @param {...string} roles - Roles to check
 * @returns {function} Express middleware
 */
exports.checkRole = (...roles) => {
  return (req, res, next) => {
    // Skip if no role restriction is defined
    if (!roles.length) return next();

    // Ensure user object exists
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated'
      });
    }

    // Ensure req.hasRole method exists
    if (!req.hasRole) {
      return res.status(500).json({
        status: 'error',
        message: 'Authorization method not available'
      });
    }

    // Check if user has any of the specified roles
    const hasRequiredRole = roles.some(role => req.hasRole(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
}; 