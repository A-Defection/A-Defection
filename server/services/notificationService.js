/**
 * Notification Service
 * 
 * Handles notification-related business logic
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');

/**
 * Get user notifications with pagination
 * @param {String} userId - User ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Notifications and pagination info
 */
const getUserNotifications = async (userId, queryParams) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Build query
  const query = Notification.find({ user: userId });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const notifications = await features.query;
  await features.countDocuments();

  return {
    data: notifications,
    pagination: features.pagination
  };
};

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @returns {Object} - Created notification
 */
const createNotification = async (notificationData) => {
  // Check if user exists
  if (notificationData.user) {
    const user = await User.findById(notificationData.user);
    if (!user) {
      throw ErrorResponse.notFound('User not found');
    }

    // Check user notification preferences
    // Skip notification if the user has disabled this type
    const notificationType = notificationData.type;
    const preference = getUserNotificationPreference(user, notificationType);
    
    if (!preference) {
      // User has disabled this notification type
      return null;
    }
  }

  // Create notification
  const notification = await Notification.create(notificationData);
  return notification;
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Object} - Updated notification
 */
const markAsRead = async (notificationId, userId) => {
  // Find notification
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw ErrorResponse.notFound('Notification not found');
  }

  // Update notification
  notification.read = true;
  await notification.save();

  return notification;
};

/**
 * Mark all notifications as read for a user
 * @param {String} userId - User ID
 * @returns {Number} - Number of notifications marked as read
 */
const markAllAsRead = async (userId) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Update all unread notifications
  const result = await Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );

  return result.nModified;
};

/**
 * Delete notification
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Boolean} - Success status
 */
const deleteNotification = async (notificationId, userId) => {
  // Find and delete notification
  const result = await Notification.deleteOne({
    _id: notificationId,
    user: userId
  });

  if (result.deletedCount === 0) {
    throw ErrorResponse.notFound('Notification not found');
  }

  return true;
};

/**
 * Check if user has enabled notification for a specific type
 * @param {Object} user - User object
 * @param {String} type - Notification type
 * @returns {Boolean} - Whether notification is enabled
 */
const getUserNotificationPreference = (user, type) => {
  if (!user.notificationPreferences) {
    return true; // Default to enabled if preferences not set
  }

  // Map notification type to preference path
  const preferenceMap = {
    'narrative': 'narrativeUpdates',
    'decision': 'decisionReminders',
    'prediction': 'predictionsResolved',
    'character': 'characterJoined'
  };

  // Default to enabled for types not specifically mapped
  if (!preferenceMap[type]) {
    return true;
  }

  // Check in-app preference (always checked first)
  const inAppEnabled = user.notificationPreferences.inApp[preferenceMap[type]];
  
  return inAppEnabled;
};

/**
 * Update user notification preferences
 * @param {String} userId - User ID
 * @param {Object} preferences - Updated preferences
 * @returns {Object} - Updated user with new preferences
 */
const updateNotificationPreferences = async (userId, preferences) => {
  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Update preferences
  user.notificationPreferences = {
    ...user.notificationPreferences,
    ...preferences
  };

  await user.save();
  return user;
};

module.exports = {
  getUserNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updateNotificationPreferences
}; 