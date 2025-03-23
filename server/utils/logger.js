/**
 * Logger Utility
 * 
 * Provides consistent logging throughout the application
 */

const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log level based on environment
const level = () => {
  const env = config.env || 'development';
  return env === 'development' ? 'debug' : 'warn';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define file transport options
const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/all.log'),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

module.exports = logger; 