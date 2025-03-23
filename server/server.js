/**
 * Main Server File
 * 
 * Sets up Express server, connects to databases,
 * and configures middleware and routes
 */

// Load environment variables
require('dotenv').config();

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');

// Import configuration
const config = require('./config/config');

// Import API routes
const apiRoutes = require('./api');

// Create Express app
const app = express();

// Connect to MongoDB
mongoose.connect(config.database.uri, config.database.options)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Apply middleware
app.use(helmet()); // Security headers
app.use(cors(config.cors)); // CORS configuration
app.use(express.json({ limit: '1mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Parse URL-encoded bodies
app.use(cookieParser(config.cookie.secret)); // Parse cookies
app.use(compression()); // Compress responses
app.use(morgan(config.env === 'development' ? 'dev' : 'combined')); // Logging

// API routes
app.use('/api', apiRoutes);

// Serve static files in production
if (config.env === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../client/build')));

  // For any other routes, serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// Error handling for 404 (Not found)
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start the server
const PORT = config.port || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  
  // Close server and exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  
  process.exit(1);
});

module.exports = server; // Export for testing 