/**
 * Validator Utility
 * 
 * Provides validation functions for request data
 */

const validator = require('validator');

// Validate email
const isEmail = (email) => {
  return validator.isEmail(email);
};

// Validate password strength
const isStrongPassword = (password) => {
  return validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  });
};

// Validate URL
const isURL = (url) => {
  return validator.isURL(url);
};

// Validate MongoDB ObjectId
const isMongoId = (id) => {
  return validator.isMongoId(id);
};

// Validate date
const isDate = (date) => {
  return validator.isDate(date);
};

// Validate numeric value
const isNumeric = (value) => {
  return validator.isNumeric(value);
};

// Validate integer
const isInt = (value, options = {}) => {
  return validator.isInt(value, options);
};

// Validate float
const isFloat = (value, options = {}) => {
  return validator.isFloat(value, options);
};

// Validate boolean
const isBoolean = (value) => {
  return validator.isBoolean(value);
};

// Validate Ethereum address
const isEthereumAddress = (address) => {
  return validator.isEthereumAddress(address);
};

// Validate JSON
const isJSON = (json) => {
  return validator.isJSON(json);
};

// Sanitize input by removing HTML tags
const sanitizeInput = (input) => {
  return validator.escape(input);
};

// Normalize email address
const normalizeEmail = (email) => {
  return validator.normalizeEmail(email);
};

module.exports = {
  isEmail,
  isStrongPassword,
  isURL,
  isMongoId,
  isDate,
  isNumeric,
  isInt,
  isFloat,
  isBoolean,
  isEthereumAddress,
  isJSON,
  sanitizeInput,
  normalizeEmail
}; 