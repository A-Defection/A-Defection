/**
 * API Routes Index
 * 
 * Centralizes all API routes and middleware
 */

const express = require('express');
const router = express.Router();

// Import middleware
const { errorHandler } = require('../middleware/errorHandler');
const { rateLimiter } = require('../middleware/rateLimiter');

// Import route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const characterRoutes = require('./routes/characters');
const narrativeRoutes = require('./routes/narratives');
const decisionRoutes = require('./routes/decisions');
const predictionRoutes = require('./routes/predictions');
const activityRoutes = require('./routes/activities');
const blockchainRoutes = require('./routes/blockchain');

// Apply rate limiter to all API routes
// 100 requests per minute max
const apiLimiter = rateLimiter(100, 60);
router.use(apiLimiter);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is operational',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/characters', characterRoutes);
router.use('/narratives', narrativeRoutes);
router.use('/decisions', decisionRoutes);
router.use('/predictions', predictionRoutes);
router.use('/activities', activityRoutes);
router.use('/blockchain', blockchainRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Apply error handler
router.use(errorHandler);

module.exports = router; 