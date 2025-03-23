/**
 * Activity Service
 * 
 * Handles activity-related business logic
 */

const Activity = require('../models/Activity');
const User = require('../models/User');
const Narrative = require('../models/Narrative');
const Character = require('../models/Character');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');

/**
 * Create a new activity log
 * @param {Object} activityData - Activity data
 * @returns {Object} - Created activity
 */
const createActivity = async (activityData) => {
  // Validate data
  if (!activityData.type) {
    throw ErrorResponse.badRequest('Activity type is required');
  }

  // If userId is provided, check if user exists
  if (activityData.user) {
    const user = await User.findById(activityData.user);
    if (!user) {
      throw ErrorResponse.notFound('User not found');
    }
  }

  // If narrativeId is provided, check if narrative exists
  if (activityData.narrative) {
    const narrative = await Narrative.findById(activityData.narrative);
    if (!narrative) {
      throw ErrorResponse.notFound('Narrative not found');
    }
  }

  // If characterId is provided, check if character exists
  if (activityData.character) {
    const character = await Character.findById(activityData.character);
    if (!character) {
      throw ErrorResponse.notFound('Character not found');
    }
  }

  // Create activity
  const activity = await Activity.create(activityData);
  return activity;
};

/**
 * Get all activities with pagination
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Activities and pagination info
 */
const getAllActivities = async (queryParams) => {
  // Build query
  const query = Activity.find();
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const activities = await features.query;
  await features.countDocuments();

  return {
    data: activities,
    pagination: features.pagination
  };
};

/**
 * Get activity feed
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Activities feed and pagination info
 */
const getActivityFeed = async (queryParams) => {
  // Build query - exclude low importance and private activities
  const baseQuery = {
    importance: { $ne: 'low' },
    isPrivate: false
  };
  
  const query = Activity.find(baseQuery);
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort({ createdAt: -1 }) // Default to newest first
    .limitFields()
    .paginate();
  
  // Execute query
  const activities = await features.query;
  await features.countDocuments();

  return {
    data: activities,
    pagination: features.pagination
  };
};

/**
 * Get user activities
 * @param {String} userId - User ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - User activities and pagination info
 */
const getUserActivities = async (userId, queryParams) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Build query
  const query = Activity.find({ user: userId });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const activities = await features.query;
  await features.countDocuments();

  return {
    data: activities,
    pagination: features.pagination
  };
};

/**
 * Get narrative activities
 * @param {String} narrativeId - Narrative ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Narrative activities and pagination info
 */
const getNarrativeActivities = async (narrativeId, queryParams) => {
  // Check if narrative exists
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Build query
  const query = Activity.find({ narrative: narrativeId });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const activities = await features.query;
  await features.countDocuments();

  return {
    data: activities,
    pagination: features.pagination
  };
};

/**
 * Get character activities
 * @param {String} characterId - Character ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Character activities and pagination info
 */
const getCharacterActivities = async (characterId, queryParams) => {
  // Check if character exists
  const character = await Character.findById(characterId);
  if (!character) {
    throw ErrorResponse.notFound('Character not found');
  }

  // Build query
  const query = Activity.find({ character: characterId });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const activities = await features.query;
  await features.countDocuments();

  return {
    data: activities,
    pagination: features.pagination
  };
};

/**
 * Get activity statistics
 * @param {Object} queryParams - Query parameters for filtering (timeframe, etc.)
 * @returns {Object} - Activity statistics
 */
const getActivityStats = async (queryParams) => {
  // Default timeframe to last 30 days if not specified
  const timeframe = queryParams.timeframe || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  // Aggregate statistics
  const stats = await Activity.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        byType: {
          $push: { k: "$type", v: 1 }
        },
        byImportance: {
          $push: { k: "$importance", v: 1 }
        },
        highImportanceCount: {
          $sum: { $cond: [{ $eq: ["$importance", "high"] }, 1, 0] }
        },
        mediumImportanceCount: {
          $sum: { $cond: [{ $eq: ["$importance", "medium"] }, 1, 0] }
        },
        lowImportanceCount: {
          $sum: { $cond: [{ $eq: ["$importance", "low"] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalCount: 1,
        byType: { $arrayToObject: "$byType" },
        byImportance: {
          high: "$highImportanceCount",
          medium: "$mediumImportanceCount",
          low: "$lowImportanceCount"
        }
      }
    }
  ]);

  // Get user activity stats
  const userStats = await Activity.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        user: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: "$user",
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 10
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo"
      }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        username: { $arrayElemAt: ["$userInfo.username", 0] }
      }
    }
  ]);

  return {
    timeframe,
    overall: stats[0] || { totalCount: 0, byType: {}, byImportance: { high: 0, medium: 0, low: 0 } },
    topUsers: userStats
  };
};

module.exports = {
  createActivity,
  getAllActivities,
  getActivityFeed,
  getUserActivities,
  getNarrativeActivities,
  getCharacterActivities,
  getActivityStats
}; 