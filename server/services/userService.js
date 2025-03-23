/**
 * User Service
 * 
 * Handles user-related business logic
 */

const User = require('../models/User');
const Character = require('../models/Character');
const Narrative = require('../models/Narrative');
const Activity = require('../models/Activity');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');
const activityService = require('./activityService');

/**
 * Get user by ID
 * @param {String} userId - User ID
 * @returns {Object} - User object
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }
  return user;
};

/**
 * Get user profile
 * @param {String} userId - User ID
 * @returns {Object} - User profile
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Count user characters
  const charactersCount = await Character.countDocuments({ user: userId });

  // Count narratives created
  const narrativesCount = await Narrative.countDocuments({ creator: userId });

  // Count activities
  const activitiesCount = await Activity.countDocuments({ user: userId });

  // Get recent activities
  const recentActivities = await Activity.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5);

  // Format profile response
  const profile = {
    id: user._id,
    username: user.username,
    email: user.email,
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
    stats: {
      charactersCount,
      narrativesCount,
      activitiesCount
    },
    recentActivities
  };

  return profile;
};

/**
 * Get public user profile
 * @param {String} username - Username
 * @returns {Object} - Public user profile
 */
const getPublicUserProfile = async (username) => {
  const user = await User.findOne({ username });
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Count user characters
  const charactersCount = await Character.countDocuments({ user: user._id });

  // Count narratives created
  const narrativesCount = await Narrative.countDocuments({ creator: user._id });

  // Count public activities
  const activitiesCount = await Activity.countDocuments({ 
    user: user._id,
    isPrivate: false
  });

  // Get recent public activities
  const recentActivities = await Activity.find({ 
    user: user._id,
    isPrivate: false
  })
    .sort({ createdAt: -1 })
    .limit(5);

  // Format public profile response - exclude private information
  const publicProfile = {
    username: user.username,
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    createdAt: user.createdAt,
    stats: {
      charactersCount,
      narrativesCount,
      activitiesCount
    },
    recentActivities
  };

  return publicProfile;
};

/**
 * Update user profile
 * @param {String} userId - User ID
 * @param {Object} updateData - Profile update data
 * @returns {Object} - Updated user
 */
const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Restrict fields that can be updated
  const allowedUpdates = ['name', 'bio', 'avatar', 'notificationPreferences'];
  const updates = Object.keys(updateData);
  
  const isValidUpdate = updates.every(update => allowedUpdates.includes(update));
  if (!isValidUpdate) {
    throw ErrorResponse.badRequest('Invalid updates');
  }

  // Apply updates
  updates.forEach(update => {
    user[update] = updateData[update];
  });

  await user.save();

  // Log activity
  await activityService.createActivity({
    type: 'profile_updated',
    user: userId,
    importance: 'low',
    isPrivate: true,
    description: 'User profile was updated'
  });

  return user;
};

/**
 * Change user password
 * @param {String} userId - User ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 * @returns {Boolean} - Success status
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Check if current password is correct
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw ErrorResponse.badRequest('Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Log activity
  await activityService.createActivity({
    type: 'password_changed',
    user: userId,
    importance: 'medium',
    isPrivate: true,
    description: 'User password was changed'
  });

  return true;
};

/**
 * Delete user account
 * @param {String} userId - User ID
 * @param {String} password - User password for confirmation
 * @returns {Boolean} - Success status
 */
const deleteAccount = async (userId, password) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Check if password is correct
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw ErrorResponse.badRequest('Password is incorrect');
  }

  // Check for ownership of narratives and decide what to do
  const narrativesCount = await Narrative.countDocuments({ creator: userId });
  if (narrativesCount > 0) {
    throw ErrorResponse.conflict(
      'User owns narratives. Please delete or transfer ownership of all narratives before deleting account.'
    );
  }

  // Delete all user's characters
  await Character.deleteMany({ user: userId });

  // Delete all user's activities
  await Activity.deleteMany({ user: userId });

  // Delete user
  await user.remove();

  return true;
};

/**
 * Check if user has specified role
 * @param {String} userId - User ID
 * @param {Array} roles - Array of roles to check
 * @returns {Boolean} - True if user has any of the specified roles
 */
const hasRole = async (userId, roles) => {
  const user = await User.findById(userId);
  if (!user) {
    return false;
  }

  if (!roles || roles.length === 0) {
    return true; // No roles specified, so any role is fine
  }

  return roles.includes(user.role);
};

/**
 * Search users
 * @param {String} searchQuery - Search query
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Search results and pagination info
 */
const searchUsers = async (searchQuery, queryParams) => {
  if (!searchQuery) {
    throw ErrorResponse.badRequest('Search query is required');
  }

  // Build query
  const query = User.find({
    $or: [
      { username: { $regex: searchQuery, $options: 'i' } },
      { name: { $regex: searchQuery, $options: 'i' } },
      { email: { $regex: searchQuery, $options: 'i' } }
    ]
  });

  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const users = await features.query;
  await features.countDocuments();

  return {
    data: users,
    pagination: features.pagination
  };
};

/**
 * Get user statistics
 * @param {String} userId - User ID
 * @returns {Object} - User statistics
 */
const getUserStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Get character stats
  const characters = await Character.find({ user: userId });
  const characterStats = {
    total: characters.length,
    byType: {}
  };

  // Count characters by type
  characters.forEach(character => {
    const type = character.type || 'other';
    characterStats.byType[type] = (characterStats.byType[type] || 0) + 1;
  });

  // Get narrative stats
  const narrativesCreated = await Narrative.countDocuments({ creator: userId });
  const narrativesParticipating = await Narrative.countDocuments({
    characters: { $in: characters.map(c => c._id) }
  });

  // Get activity stats
  const activityCount = await Activity.countDocuments({ user: userId });
  const activityByType = await Activity.aggregate([
    {
      $match: { user: user._id }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);

  // Format activity stats
  const activityStats = {
    total: activityCount,
    byType: {}
  };

  activityByType.forEach(item => {
    activityStats.byType[item._id] = item.count;
  });

  return {
    user: {
      id: user._id,
      username: user.username,
      createdAt: user.createdAt
    },
    stats: {
      characters: characterStats,
      narratives: {
        created: narrativesCreated,
        participating: narrativesParticipating
      },
      activity: activityStats
    }
  };
};

module.exports = {
  getUserById,
  getUserProfile,
  getPublicUserProfile,
  updateUserProfile,
  changePassword,
  deleteAccount,
  hasRole,
  searchUsers,
  getUserStats
}; 