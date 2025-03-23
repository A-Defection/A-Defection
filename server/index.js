/**
 * Server Entry Point
 * 
 * This is the entry point for the server application.
 * It loads the main server file and handles any top-level errors.
 */

try {
  // Load the main server file
  const server = require('./server');
  
  // Export the server for testing or other uses
  module.exports = server;
} catch (error) {
  console.error('Fatal error during server startup:');
  console.error(error);
  process.exit(1);
} 