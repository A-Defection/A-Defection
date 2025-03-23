/**
 * Error Response Utility
 * 
 * Provides a consistent structure for API error responses
 */

class ErrorResponse extends Error {
  /**
   * Create a new error response
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code
   * @param {Object} errors - Additional error details
   */
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true; // Indicates this is a known operational error

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a Bad Request (400) error
   * @param {String} message - Error message
   * @param {Object} errors - Additional error details
   * @returns {ErrorResponse} - Error response instance
   */
  static badRequest(message = 'Bad Request', errors = null) {
    return new ErrorResponse(message, 400, errors);
  }

  /**
   * Create an Unauthorized (401) error
   * @param {String} message - Error message
   * @returns {ErrorResponse} - Error response instance
   */
  static unauthorized(message = 'Unauthorized') {
    return new ErrorResponse(message, 401);
  }

  /**
   * Create a Forbidden (403) error
   * @param {String} message - Error message
   * @returns {ErrorResponse} - Error response instance
   */
  static forbidden(message = 'Forbidden') {
    return new ErrorResponse(message, 403);
  }

  /**
   * Create a Not Found (404) error
   * @param {String} message - Error message
   * @returns {ErrorResponse} - Error response instance
   */
  static notFound(message = 'Resource not found') {
    return new ErrorResponse(message, 404);
  }

  /**
   * Create a Conflict (409) error
   * @param {String} message - Error message
   * @returns {ErrorResponse} - Error response instance
   */
  static conflict(message = 'Resource already exists') {
    return new ErrorResponse(message, 409);
  }

  /**
   * Create a Validation Error (422) error
   * @param {String} message - Error message
   * @param {Object} errors - Validation errors
   * @returns {ErrorResponse} - Error response instance
   */
  static validation(message = 'Validation Error', errors) {
    return new ErrorResponse(message, 422, errors);
  }

  /**
   * Create a Server Error (500) error
   * @param {String} message - Error message
   * @returns {ErrorResponse} - Error response instance
   */
  static serverError(message = 'Internal Server Error') {
    return new ErrorResponse(message, 500);
  }

  /**
   * Format error for response
   * @returns {Object} - Formatted error object
   */
  toJSON() {
    const response = {
      success: false,
      status: this.statusCode,
      message: this.message
    };

    if (this.errors) {
      response.errors = this.errors;
    }

    return response;
  }
}

module.exports = ErrorResponse; 