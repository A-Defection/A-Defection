/**
 * User Routes
 * 
 * Routes for user profile management and related operations
 */

const express = require('express');
const userController = require('../../controllers/userController');
const { protect, authorize } = require('../../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all user routes
router.use(protect);

// Profile management routes
router.get('/me', userController.getCurrentUser);
router.put('/profile', userController.updateProfile);
router.put('/password', userController.changePassword);
router.delete('/account', userController.deleteAccount);

// Activity and notifications routes
router.get('/activity', userController.getUserActivity);
router.get('/notifications', userController.getUserNotifications);
router.put('/notifications/:id', userController.markNotificationAsRead);
router.put('/notifications', userController.markAllNotificationsAsRead);
router.put('/notification-preferences', userController.updateNotificationPreferences);

// Stats and analytics
router.get('/stats', userController.getUserStats);

// Admin routes
router.get('/search', authorize('admin'), userController.searchUsers);

// Public profile routes (still authenticated to prevent scraping)
router.get('/:username', userController.getUserByUsername);

module.exports = router; 