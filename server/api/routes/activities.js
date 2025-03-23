/**
 * Activity Routes
 */

const express = require('express');
const router = express.Router();
const activityController = require('../../controllers/activityController');
const { auth } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/checkRole');

// Public routes
router.get('/feed', activityController.getActivityFeed);
router.get('/narrative/:id', activityController.getNarrativeActivity);

// Protected routes (require authentication)
router.use(auth);

// Activity retrieval (with filters)
router.get('/', activityController.getAllActivities);

// Stats and analytics
router.get('/stats', activityController.getActivityStats);

// Admin-only routes
router.post('/', auth, checkRole('admin'), activityController.createActivity);

module.exports = router; 