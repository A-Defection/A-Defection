/**
 * Decision Service
 * 
 * Handles decision-related business logic
 */

const Decision = require('../models/Decision');
const User = require('../models/User');
const Character = require('../models/Character');
const Narrative = require('../models/Narrative');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');
const activityService = require('./activityService');
const notificationService = require('./notificationService');

/**
 * Create a new decision
 * @param {Object} decisionData - Decision data
 * @param {String} userId - User ID creating the decision
 * @returns {Object} - Created decision
 */
const createDecision = async (decisionData, userId) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Check if character exists and belongs to user
  if (decisionData.character) {
    const character = await Character.findById(decisionData.character);
    if (!character) {
      throw ErrorResponse.notFound('Character not found');
    }

    if (character.user.toString() !== userId && !user.isAdmin) {
      throw ErrorResponse.forbidden('You do not have permission to use this character');
    }
  }

  // Check if narrative exists
  if (decisionData.narrative) {
    const narrative = await Narrative.findById(decisionData.narrative);
    if (!narrative) {
      throw ErrorResponse.notFound('Narrative not found');
    }

    // Check if narrative is active
    if (narrative.status !== 'active' && narrative.status !== 'ongoing') {
      throw ErrorResponse.conflict('Cannot create decisions for inactive narratives');
    }
  }

  // Set default values
  decisionData.creator = userId;
  decisionData.status = decisionData.status || 'pending';
  
  // Set expiration time if not provided
  if (!decisionData.expiresAt) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Default 24 hours
    decisionData.expiresAt = expiresAt;
  }

  // Create decision
  const decision = await Decision.create(decisionData);

  // Log activity
  await activityService.createActivity({
    type: 'decision_created',
    user: userId,
    character: decisionData.character,
    narrative: decisionData.narrative,
    importance: 'medium',
    description: `New decision created: "${decision.title}"`
  });

  // Notify narrative participants if this is a narrative decision
  if (decision.narrative) {
    const narrative = await Narrative.findById(decision.narrative).populate({
      path: 'characters',
      select: 'user'
    });
    
    // Get unique user IDs from characters in the narrative
    const userIds = [...new Set(
      narrative.characters
        .map(character => character.user.toString())
        .filter(id => id !== userId) // Don't notify the creator
    )];
    
    // Create notifications for each user
    for (const participantId of userIds) {
      await notificationService.createNotification({
        user: participantId,
        type: 'decision',
        title: 'New Decision Available',
        content: `A new decision "${decision.title}" is available in narrative "${narrative.title}"`,
        read: false,
        relatedModels: {
          decision: decision._id,
          narrative: narrative._id
        }
      });
    }
  }

  return decision;
};

/**
 * Get all decisions with pagination
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Decisions and pagination info
 */
const getAllDecisions = async (queryParams) => {
  // Build query - only get public decisions
  const query = Decision.find({ isPublic: true });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const decisions = await features.query
    .populate('creator', 'username')
    .populate('character', 'name')
    .populate('narrative', 'title');
  
  await features.countDocuments();

  return {
    data: decisions,
    pagination: features.pagination
  };
};

/**
 * Get a decision by ID
 * @param {String} decisionId - Decision ID
 * @returns {Object} - Decision
 */
const getDecisionById = async (decisionId) => {
  const decision = await Decision.findById(decisionId)
    .populate('creator', 'username')
    .populate('character', 'name type')
    .populate('narrative', 'title')
    .populate('chosenOption')
    .populate({
      path: 'votes',
      populate: {
        path: 'user',
        select: 'username'
      }
    });

  if (!decision) {
    throw ErrorResponse.notFound('Decision not found');
  }

  // Check if decision is public or return limited info
  if (!decision.isPublic) {
    const limitedDecision = {
      _id: decision._id,
      title: decision.title,
      status: decision.status,
      createdAt: decision.createdAt,
      isPublic: false
    };
    
    throw ErrorResponse.forbidden(
      'This decision is private',
      { decision: limitedDecision }
    );
  }

  return decision;
};

/**
 * Get decisions by user
 * @param {String} userId - User ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - User's decisions and pagination info
 */
const getUserDecisions = async (userId, queryParams) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Build query
  const query = Decision.find({ creator: userId });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const decisions = await features.query
    .populate('character', 'name')
    .populate('narrative', 'title');
  
  await features.countDocuments();

  return {
    data: decisions,
    pagination: features.pagination
  };
};

/**
 * Get decisions by narrative
 * @param {String} narrativeId - Narrative ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Narrative's decisions and pagination info
 */
const getNarrativeDecisions = async (narrativeId, queryParams) => {
  // Check if narrative exists
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Build query - only get public decisions or require authorization
  const query = Decision.find({
    narrative: narrativeId,
    isPublic: true
  });
  
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const decisions = await features.query
    .populate('creator', 'username')
    .populate('character', 'name')
    .populate('chosenOption');
  
  await features.countDocuments();

  return {
    data: decisions,
    pagination: features.pagination
  };
};

/**
 * Update a decision
 * @param {String} decisionId - Decision ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID making the update
 * @returns {Object} - Updated decision
 */
const updateDecision = async (decisionId, updateData, userId) => {
  // Find decision
  const decision = await Decision.findById(decisionId);
  if (!decision) {
    throw ErrorResponse.notFound('Decision not found');
  }

  // Check ownership or admin
  if (decision.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to update this decision');
  }

  // Check if decision can be updated based on status
  if (decision.status === 'completed' || decision.status === 'expired') {
    const allowedFields = ['description', 'isPublic'];
    
    for (const field in updateData) {
      if (!allowedFields.includes(field)) {
        throw ErrorResponse.conflict(`Cannot update field "${field}" for a completed or expired decision`);
      }
    }
  }

  // Update decision
  Object.keys(updateData).forEach(key => {
    decision[key] = updateData[key];
  });

  decision.updatedAt = Date.now();
  await decision.save();

  // Log activity
  await activityService.createActivity({
    type: 'decision_updated',
    user: userId,
    narrative: decision.narrative,
    importance: 'low',
    description: `Decision "${decision.title}" was updated`
  });

  return decision;
};

/**
 * Delete a decision
 * @param {String} decisionId - Decision ID
 * @param {String} userId - User ID making the deletion
 * @returns {Object} - Deletion status
 */
const deleteDecision = async (decisionId, userId) => {
  // Find decision
  const decision = await Decision.findById(decisionId);
  if (!decision) {
    throw ErrorResponse.notFound('Decision not found');
  }

  // Check ownership or admin
  if (decision.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to delete this decision');
  }

  // Check if decision has votes
  if (decision.votes && decision.votes.length > 0) {
    throw ErrorResponse.conflict(
      'Cannot delete decision with existing votes. Consider canceling it instead.'
    );
  }

  // Delete decision
  await decision.remove();

  // Log activity
  await activityService.createActivity({
    type: 'decision_deleted',
    user: userId,
    narrative: decision.narrative,
    importance: 'medium',
    description: `Decision "${decision.title}" was deleted`
  });

  return { success: true, message: 'Decision successfully deleted' };
};

/**
 * Choose an option for a decision
 * @param {String} decisionId - Decision ID
 * @param {String} optionIndex - Option index
 * @param {String} userId - User ID making the choice
 * @returns {Object} - Updated decision
 */
const chooseOption = async (decisionId, optionIndex, userId) => {
  // Find decision
  const decision = await Decision.findById(decisionId);
  if (!decision) {
    throw ErrorResponse.notFound('Decision not found');
  }

  // Check ownership or admin
  if (decision.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to choose an option for this decision');
  }

  // Check if decision is still active
  if (decision.status !== 'active' && decision.status !== 'pending') {
    throw ErrorResponse.conflict(`Cannot choose option for a ${decision.status} decision`);
  }

  // Check if option exists
  if (!decision.options || !decision.options[optionIndex]) {
    throw ErrorResponse.badRequest('Invalid option index');
  }

  // Choose option
  decision.chosenOption = optionIndex;
  decision.status = 'completed';
  decision.completedAt = Date.now();
  await decision.save();

  // Log activity
  await activityService.createActivity({
    type: 'decision_completed',
    user: userId,
    character: decision.character,
    narrative: decision.narrative,
    importance: 'high',
    description: `Decision "${decision.title}" was completed. Option chosen: "${decision.options[optionIndex].text}"`
  });

  // If narrative is attached, notify narrative participants
  if (decision.narrative) {
    const narrative = await Narrative.findById(decision.narrative).populate({
      path: 'characters',
      select: 'user'
    });
    
    // Get unique user IDs from characters in the narrative
    const userIds = [...new Set(
      narrative.characters
        .map(character => character.user.toString())
        .filter(id => id !== userId) // Don't notify the decider
    )];
    
    // Create notifications for each user
    for (const participantId of userIds) {
      await notificationService.createNotification({
        user: participantId,
        type: 'decision',
        title: 'Decision Completed',
        content: `The decision "${decision.title}" has been resolved in narrative "${narrative.title}"`,
        read: false,
        relatedModels: {
          decision: decision._id,
          narrative: narrative._id
        }
      });
    }
  }

  return decision;
};

/**
 * Cancel a decision
 * @param {String} decisionId - Decision ID
 * @param {String} userId - User ID canceling the decision
 * @returns {Object} - Updated decision
 */
const cancelDecision = async (decisionId, userId) => {
  // Find decision
  const decision = await Decision.findById(decisionId);
  if (!decision) {
    throw ErrorResponse.notFound('Decision not found');
  }

  // Check ownership or admin
  if (decision.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to cancel this decision');
  }

  // Check if decision can be canceled
  if (decision.status === 'completed' || decision.status === 'canceled') {
    throw ErrorResponse.conflict(`Cannot cancel a ${decision.status} decision`);
  }

  // Cancel decision
  decision.status = 'canceled';
  decision.completedAt = Date.now();
  await decision.save();

  // Log activity
  await activityService.createActivity({
    type: 'decision_canceled',
    user: userId,
    narrative: decision.narrative,
    importance: 'medium',
    description: `Decision "${decision.title}" was canceled`
  });

  return decision;
};

/**
 * Extend decision time limit
 * @param {String} decisionId - Decision ID
 * @param {Number} hours - Hours to extend
 * @param {String} userId - User ID extending the decision
 * @returns {Object} - Updated decision
 */
const extendTimeLimit = async (decisionId, hours, userId) => {
  if (!hours || hours <= 0) {
    throw ErrorResponse.badRequest('Extension hours must be a positive number');
  }

  // Find decision
  const decision = await Decision.findById(decisionId);
  if (!decision) {
    throw ErrorResponse.notFound('Decision not found');
  }

  // Check ownership or admin
  if (decision.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to extend this decision');
  }

  // Check if decision is active or pending
  if (decision.status !== 'active' && decision.status !== 'pending') {
    throw ErrorResponse.conflict(`Cannot extend a ${decision.status} decision`);
  }

  // Calculate new expiration time
  const newExpiresAt = new Date(decision.expiresAt);
  newExpiresAt.setHours(newExpiresAt.getHours() + hours);
  
  // Update decision
  decision.expiresAt = newExpiresAt;
  await decision.save();

  // Log activity
  await activityService.createActivity({
    type: 'decision_extended',
    user: userId,
    narrative: decision.narrative,
    importance: 'low',
    description: `Decision "${decision.title}" time limit extended by ${hours} hours`
  });

  return decision;
};

/**
 * Check for expired decisions and update their status
 * @returns {Number} - Number of decisions updated
 */
const checkExpiredDecisions = async () => {
  const now = new Date();
  
  // Find active decisions that have expired
  const expiredDecisions = await Decision.find({
    status: { $in: ['active', 'pending'] },
    expiresAt: { $lt: now }
  });

  let updatedCount = 0;

  // Update each expired decision
  for (const decision of expiredDecisions) {
    decision.status = 'expired';
    await decision.save();
    updatedCount++;

    // Log activity
    await activityService.createActivity({
      type: 'decision_expired',
      narrative: decision.narrative,
      importance: 'medium',
      description: `Decision "${decision.title}" has expired without completion`
    });
  }

  return updatedCount;
};

/**
 * Get decision statistics
 * @param {Object} queryParams - Query parameters for filtering (timeframe, etc.)
 * @returns {Object} - Decision statistics
 */
const getDecisionStats = async (queryParams) => {
  // Default timeframe to last 30 days if not specified
  const timeframe = queryParams.timeframe || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  // Get counts by status
  const statusStats = await Decision.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get narrative with most decisions
  const topNarratives = await Decision.aggregate([
    {
      $match: {
        narrative: { $exists: true, $ne: null },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$narrative',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 5
    },
    {
      $lookup: {
        from: 'narratives',
        localField: '_id',
        foreignField: '_id',
        as: 'narrativeInfo'
      }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        title: { $arrayElemAt: ['$narrativeInfo.title', 0] }
      }
    }
  ]);

  // Format status stats
  const formattedStatusStats = {
    active: 0,
    pending: 0,
    completed: 0,
    expired: 0,
    canceled: 0
  };

  statusStats.forEach(stat => {
    formattedStatusStats[stat._id] = stat.count;
  });

  return {
    timeframe,
    totalCount: await Decision.countDocuments({ createdAt: { $gte: startDate } }),
    byStatus: formattedStatusStats,
    topNarratives
  };
};

module.exports = {
  createDecision,
  getAllDecisions,
  getDecisionById,
  getUserDecisions,
  getNarrativeDecisions,
  updateDecision,
  deleteDecision,
  chooseOption,
  cancelDecision,
  extendTimeLimit,
  checkExpiredDecisions,
  getDecisionStats
}; 