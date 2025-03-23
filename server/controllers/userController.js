/**
 * User Controller
 * 
 * Handles user-related API requests
 */

const User = require('../models/User');
const Notification = require('../models/Notification');
const ErrorResponse = require('../utils/errorResponse');
const userService = require('../services/userService');
const notificationService = require('../services/notificationService');

/**
 * Get current user
 * @route GET /api/users/me
 * @access Private
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const profile = await userService.getUserProfile(req.user.id);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUserProfile(req.user.id, req.body);
    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * @route PUT /api/users/password
 * @access Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(ErrorResponse.badRequest('Please provide current and new password'));
    }

    await userService.changePassword(req.user.id, currentPassword, newPassword);
    
    res.status(200).json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 * @route DELETE /api/users/account
 * @access Private
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return next(ErrorResponse.badRequest('Please provide your password'));
    }

    await userService.deleteAccount(req.user.id, password);
    
    res.status(200).json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user profile by username
 * @route GET /api/users/:username
 * @access Private
 */
exports.getUserByUsername = async (req, res, next) => {
  try {
    const profile = await userService.getPublicUserProfile(req.params.username);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user activity
 * @route GET /api/users/activity
 * @access Private
 */
exports.getUserActivity = async (req, res, next) => {
  try {
    const activities = await req.user.getActivities(req.query);
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user notifications
 * @route GET /api/users/notifications
 * @access Private
 */
exports.getUserNotifications = async (req, res, next) => {
  try {
    const notificationsData = await notificationService.getUserNotifications(req.user.id, req.query);
    res.status(200).json({ success: true, ...notificationsData });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 * @route PUT /api/users/notifications/:id
 * @access Private
 */
exports.markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read
 * @route PUT /api/users/notifications
 * @access Private
 */
exports.markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);
    res.status(200).json({ 
      success: true, 
      message: `${count} notifications marked as read` 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update notification preferences
 * @route PUT /api/users/notification-preferences
 * @access Private
 */
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const updatedUser = await notificationService.updateNotificationPreferences(
      req.user.id, 
      req.body
    );
    
    res.status(200).json({ 
      success: true, 
      data: updatedUser.notificationPreferences 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search users
 * @route GET /api/users/search
 * @access Private (Admin)
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return next(ErrorResponse.badRequest('Search query is required'));
    }
    
    const result = await userService.searchUsers(query, req.query);
    
    res.status(200).json({ 
      success: true, 
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics
 * @route GET /api/users/stats
 * @access Private
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const stats = await userService.getUserStats(req.user.id);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}; 