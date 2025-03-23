/**
 * Prediction Service
 * 
 * Handles prediction-related business logic
 */

const Prediction = require('../models/Prediction');
const User = require('../models/User');
const Character = require('../models/Character');
const Narrative = require('../models/Narrative');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');
const activityService = require('./activityService');
const notificationService = require('./notificationService');

/**
 * Create a new prediction
 * @param {Object} predictionData - Prediction data
 * @param {String} userId - User ID creating the prediction
 * @returns {Object} - Created prediction
 */
const createPrediction = async (predictionData, userId) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Check if character exists and belongs to user
  if (predictionData.character) {
    const character = await Character.findById(predictionData.character);
    if (!character) {
      throw ErrorResponse.notFound('Character not found');
    }

    if (character.user.toString() !== userId && !user.isAdmin) {
      throw ErrorResponse.forbidden('You do not have permission to use this character');
    }
  }

  // Check if narrative exists
  if (predictionData.narrative) {
    const narrative = await Narrative.findById(predictionData.narrative);
    if (!narrative) {
      throw ErrorResponse.notFound('Narrative not found');
    }

    // Check if narrative is active
    if (narrative.status !== 'active' && narrative.status !== 'ongoing') {
      throw ErrorResponse.conflict('Cannot create predictions for inactive narratives');
    }
  }

  // Set default values
  predictionData.creator = userId;
  predictionData.status = predictionData.status || 'active';
  
  // Set expiration time if not provided
  if (!predictionData.expiresAt) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days
    predictionData.expiresAt = expiresAt;
  }

  // Initialize votes array with options
  if (predictionData.options && !predictionData.votes) {
    predictionData.votes = predictionData.options.map(() => []);
  }

  // Create prediction
  const prediction = await Prediction.create(predictionData);

  // Log activity
  await activityService.createActivity({
    type: 'prediction_created',
    user: userId,
    character: predictionData.character,
    narrative: predictionData.narrative,
    importance: 'medium',
    description: `New prediction created: "${prediction.statement}"`
  });

  // Notify narrative participants if this is a narrative prediction
  if (prediction.narrative) {
    const narrative = await Narrative.findById(prediction.narrative).populate({
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
        type: 'prediction',
        title: 'New Prediction Available',
        content: `A new prediction "${prediction.statement}" is available in narrative "${narrative.title}"`,
        read: false,
        relatedModels: {
          prediction: prediction._id,
          narrative: narrative._id
        }
      });
    }
  }

  return prediction;
};

/**
 * Get all predictions with pagination
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Predictions and pagination info
 */
const getAllPredictions = async (queryParams) => {
  // Build query - only get public predictions
  const query = Prediction.find({ isPublic: true });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const predictions = await features.query
    .populate('creator', 'username')
    .populate('character', 'name')
    .populate('narrative', 'title');
  
  await features.countDocuments();

  return {
    data: predictions,
    pagination: features.pagination
  };
};

/**
 * Get trending predictions
 * @param {Number} limit - Number of predictions to return
 * @returns {Array} - Trending predictions
 */
const getTrendingPredictions = async (limit = 10) => {
  // Get most active predictions based on vote count
  const predictions = await Prediction.aggregate([
    {
      $match: {
        isPublic: true,
        status: 'active'
      }
    },
    {
      $project: {
        statement: 1,
        options: 1,
        creator: 1,
        character: 1,
        narrative: 1,
        createdAt: 1,
        expiresAt: 1,
        totalVotes: { $sum: { $map: { input: '$votes', as: 'vote', in: { $size: '$$vote' } } } }
      }
    },
    {
      $sort: { totalVotes: -1, createdAt: -1 }
    },
    {
      $limit: limit
    }
  ]);

  // Populate references
  await Prediction.populate(predictions, [
    { path: 'creator', select: 'username' },
    { path: 'character', select: 'name type' },
    { path: 'narrative', select: 'title' }
  ]);

  return predictions;
};

/**
 * Get a prediction by ID
 * @param {String} predictionId - Prediction ID
 * @returns {Object} - Prediction
 */
const getPredictionById = async (predictionId) => {
  const prediction = await Prediction.findById(predictionId)
    .populate('creator', 'username')
    .populate('character', 'name type')
    .populate('narrative', 'title')
    .populate({
      path: 'votes',
      populate: {
        path: 'user',
        select: 'username'
      }
    });

  if (!prediction) {
    throw ErrorResponse.notFound('Prediction not found');
  }

  // Check if prediction is public or return limited info
  if (!prediction.isPublic) {
    const limitedPrediction = {
      _id: prediction._id,
      statement: prediction.statement,
      status: prediction.status,
      createdAt: prediction.createdAt,
      isPublic: false
    };
    
    throw ErrorResponse.forbidden(
      'This prediction is private',
      { prediction: limitedPrediction }
    );
  }

  return prediction;
};

/**
 * Get predictions by user
 * @param {String} userId - User ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - User's predictions and pagination info
 */
const getUserPredictions = async (userId, queryParams) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Build query
  const query = Prediction.find({ creator: userId });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const predictions = await features.query
    .populate('character', 'name')
    .populate('narrative', 'title');
  
  await features.countDocuments();

  return {
    data: predictions,
    pagination: features.pagination
  };
};

/**
 * Get predictions by narrative
 * @param {String} narrativeId - Narrative ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Narrative's predictions and pagination info
 */
const getNarrativePredictions = async (narrativeId, queryParams) => {
  // Check if narrative exists
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Build query - only get public predictions or require authorization
  const query = Prediction.find({
    narrative: narrativeId,
    isPublic: true
  });
  
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const predictions = await features.query
    .populate('creator', 'username')
    .populate('character', 'name');
  
  await features.countDocuments();

  return {
    data: predictions,
    pagination: features.pagination
  };
};

/**
 * Update a prediction
 * @param {String} predictionId - Prediction ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID making the update
 * @returns {Object} - Updated prediction
 */
const updatePrediction = async (predictionId, updateData, userId) => {
  // Find prediction
  const prediction = await Prediction.findById(predictionId);
  if (!prediction) {
    throw ErrorResponse.notFound('Prediction not found');
  }

  // Check ownership or admin
  if (prediction.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to update this prediction');
  }

  // Check if prediction can be updated based on status
  if (prediction.status !== 'active') {
    const allowedFields = ['description', 'isPublic'];
    
    for (const field in updateData) {
      if (!allowedFields.includes(field)) {
        throw ErrorResponse.conflict(`Cannot update field "${field}" for a non-active prediction`);
      }
    }
  }

  // Prevent changing options if votes exist
  if (updateData.options && 
      prediction.votes && 
      prediction.votes.some(arr => arr.length > 0)) {
    throw ErrorResponse.conflict('Cannot update options for a prediction with existing votes');
  }

  // Update prediction
  Object.keys(updateData).forEach(key => {
    prediction[key] = updateData[key];
  });

  prediction.updatedAt = Date.now();
  await prediction.save();

  // Log activity
  await activityService.createActivity({
    type: 'prediction_updated',
    user: userId,
    narrative: prediction.narrative,
    importance: 'low',
    description: `Prediction "${prediction.statement}" was updated`
  });

  return prediction;
};

/**
 * Delete a prediction
 * @param {String} predictionId - Prediction ID
 * @param {String} userId - User ID making the deletion
 * @returns {Object} - Deletion status
 */
const deletePrediction = async (predictionId, userId) => {
  // Find prediction
  const prediction = await Prediction.findById(predictionId);
  if (!prediction) {
    throw ErrorResponse.notFound('Prediction not found');
  }

  // Check ownership or admin
  if (prediction.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to delete this prediction');
  }

  // Check if prediction has votes
  if (prediction.votes && prediction.votes.some(arr => arr.length > 0)) {
    throw ErrorResponse.conflict(
      'Cannot delete prediction with existing votes. Consider canceling it instead.'
    );
  }

  // Delete prediction
  await prediction.remove();

  // Log activity
  await activityService.createActivity({
    type: 'prediction_deleted',
    user: userId,
    narrative: prediction.narrative,
    importance: 'medium',
    description: `Prediction "${prediction.statement}" was deleted`
  });

  return { success: true, message: 'Prediction successfully deleted' };
};

/**
 * Vote on a prediction
 * @param {String} predictionId - Prediction ID
 * @param {Number} optionIndex - Option index
 * @param {String} userId - User ID making the vote
 * @returns {Object} - Updated prediction
 */
const votePrediction = async (predictionId, optionIndex, userId) => {
  // Find prediction
  const prediction = await Prediction.findById(predictionId);
  if (!prediction) {
    throw ErrorResponse.notFound('Prediction not found');
  }

  // Check if prediction is active
  if (prediction.status !== 'active') {
    throw ErrorResponse.conflict(`Cannot vote on a ${prediction.status} prediction`);
  }

  // Check if option exists
  if (!prediction.options || !prediction.options[optionIndex]) {
    throw ErrorResponse.badRequest('Invalid option index');
  }

  // Check if user has already voted on any option
  let userAlreadyVoted = false;
  let previousVoteOption = -1;

  prediction.votes.forEach((votes, index) => {
    const userVoteIndex = votes.findIndex(vote => vote.toString() === userId);
    if (userVoteIndex !== -1) {
      userAlreadyVoted = true;
      previousVoteOption = index;
      // Remove previous vote
      prediction.votes[index].splice(userVoteIndex, 1);
    }
  });

  // Add vote to selected option
  prediction.votes[optionIndex].push(userId);
  await prediction.save();

  // Log activity
  const activityDescription = userAlreadyVoted
    ? `User changed vote on prediction "${prediction.statement}" from option ${previousVoteOption + 1} to option ${optionIndex + 1}`
    : `User voted on prediction "${prediction.statement}", option ${optionIndex + 1}`;

  await activityService.createActivity({
    type: 'prediction_voted',
    user: userId,
    narrative: prediction.narrative,
    importance: 'low',
    description: activityDescription
  });

  return prediction;
};

/**
 * Resolve a prediction
 * @param {String} predictionId - Prediction ID
 * @param {Number} correctOptionIndex - Correct option index
 * @param {String} userId - User ID resolving the prediction
 * @returns {Object} - Updated prediction
 */
const resolvePrediction = async (predictionId, correctOptionIndex, userId) => {
  // Find prediction
  const prediction = await Prediction.findById(predictionId);
  if (!prediction) {
    throw ErrorResponse.notFound('Prediction not found');
  }

  // Check ownership or admin
  if (prediction.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to resolve this prediction');
  }

  // Check if prediction is active
  if (prediction.status !== 'active') {
    throw ErrorResponse.conflict(`Cannot resolve a ${prediction.status} prediction`);
  }

  // Check if option exists
  if (!prediction.options || !prediction.options[correctOptionIndex]) {
    throw ErrorResponse.badRequest('Invalid option index');
  }

  // Resolve prediction
  prediction.result = correctOptionIndex;
  prediction.status = 'resolved';
  prediction.resolvedAt = Date.now();
  await prediction.save();

  // Log activity
  await activityService.createActivity({
    type: 'prediction_resolved',
    user: userId,
    narrative: prediction.narrative,
    importance: 'high',
    description: `Prediction "${prediction.statement}" was resolved. Correct option: "${prediction.options[correctOptionIndex]}"`
  });

  // If narrative is attached, notify narrative participants
  if (prediction.narrative) {
    const narrative = await Narrative.findById(prediction.narrative).populate({
      path: 'characters',
      select: 'user'
    });
    
    // Get unique user IDs from characters in the narrative
    const userIds = [...new Set(
      narrative.characters
        .map(character => character.user.toString())
        .filter(id => id !== userId) // Don't notify the resolver
    )];
    
    // Create notifications for each user
    for (const participantId of userIds) {
      await notificationService.createNotification({
        user: participantId,
        type: 'prediction',
        title: 'Prediction Resolved',
        content: `The prediction "${prediction.statement}" has been resolved in narrative "${narrative.title}"`,
        read: false,
        relatedModels: {
          prediction: prediction._id,
          narrative: narrative._id
        }
      });
    }
  }

  return prediction;
};

/**
 * Cancel a prediction
 * @param {String} predictionId - Prediction ID
 * @param {String} reason - Cancellation reason
 * @param {String} userId - User ID canceling the prediction
 * @returns {Object} - Updated prediction
 */
const cancelPrediction = async (predictionId, reason, userId) => {
  // Find prediction
  const prediction = await Prediction.findById(predictionId);
  if (!prediction) {
    throw ErrorResponse.notFound('Prediction not found');
  }

  // Check ownership or admin
  if (prediction.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to cancel this prediction');
  }

  // Check if prediction can be canceled
  if (prediction.status !== 'active') {
    throw ErrorResponse.conflict(`Cannot cancel a ${prediction.status} prediction`);
  }

  // Cancel prediction
  prediction.status = 'canceled';
  prediction.cancelReason = reason || 'No reason provided';
  prediction.resolvedAt = Date.now();
  await prediction.save();

  // Log activity
  await activityService.createActivity({
    type: 'prediction_canceled',
    user: userId,
    narrative: prediction.narrative,
    importance: 'medium',
    description: `Prediction "${prediction.statement}" was canceled. Reason: ${prediction.cancelReason}`
  });

  return prediction;
};

/**
 * Check for expired predictions and update their status
 * @returns {Number} - Number of predictions updated
 */
const checkExpiredPredictions = async () => {
  const now = new Date();
  
  // Find active predictions that have expired
  const expiredPredictions = await Prediction.find({
    status: 'active',
    expiresAt: { $lt: now }
  });

  let updatedCount = 0;

  // Update each expired prediction
  for (const prediction of expiredPredictions) {
    prediction.status = 'expired';
    await prediction.save();
    updatedCount++;

    // Log activity
    await activityService.createActivity({
      type: 'prediction_expired',
      narrative: prediction.narrative,
      importance: 'medium',
      description: `Prediction "${prediction.statement}" has expired without resolution`
    });
  }

  return updatedCount;
};

/**
 * Get prediction leaderboard
 * @param {Object} queryParams - Query parameters for filtering (timeframe, etc.)
 * @returns {Array} - Leaderboard data
 */
const getPredictionLeaderboard = async (queryParams) => {
  // Default timeframe to all time if not specified
  const timeframe = queryParams.timeframe || 'all';
  let startDate = new Date(0); // Jan 1, 1970
  
  if (timeframe !== 'all') {
    startDate = new Date();
    const days = parseInt(timeframe) || 30;
    startDate.setDate(startDate.getDate() - days);
  }

  // Find all resolved predictions in the timeframe
  const resolvedPredictions = await Prediction.find({
    status: 'resolved',
    resolvedAt: { $gte: startDate }
  }).populate('votes.user', 'username');

  // Process predictions to calculate user scores
  const userScores = {};

  resolvedPredictions.forEach(prediction => {
    const correctOptionIndex = prediction.result;
    if (correctOptionIndex === undefined || correctOptionIndex === null) return;

    // Get correct voters
    const correctVoters = prediction.votes[correctOptionIndex] || [];
    
    // Award points to correct voters
    correctVoters.forEach(voterId => {
      const userIdStr = voterId.toString();
      if (!userScores[userIdStr]) {
        userScores[userIdStr] = {
          userId: userIdStr,
          correctVotes: 0,
          totalVotes: 0,
          score: 0
        };
      }
      
      userScores[userIdStr].correctVotes += 1;
      userScores[userIdStr].score += 10; // Award 10 points per correct prediction
    });

    // Count total votes per user (across all options)
    prediction.votes.forEach(optionVoters => {
      optionVoters.forEach(voterId => {
        const userIdStr = voterId.toString();
        if (!userScores[userIdStr]) {
          userScores[userIdStr] = {
            userId: userIdStr,
            correctVotes: 0,
            totalVotes: 0,
            score: 0
          };
        }
        
        userScores[userIdStr].totalVotes += 1;
      });
    });
  });

  // Convert to array and sort by score
  const leaderboard = Object.values(userScores)
    .sort((a, b) => b.score - a.score || b.correctVotes - a.correctVotes)
    .slice(0, 25); // Top 25 users

  // Add username and calculate accuracy
  const leaderboardWithDetails = await Promise.all(
    leaderboard.map(async (entry) => {
      const user = await User.findById(entry.userId).select('username');
      const accuracy = entry.totalVotes > 0 
        ? ((entry.correctVotes / entry.totalVotes) * 100).toFixed(1) 
        : '0.0';
      
      return {
        userId: entry.userId,
        username: user ? user.username : 'Unknown User',
        correctVotes: entry.correctVotes,
        totalVotes: entry.totalVotes,
        score: entry.score,
        accuracy: `${accuracy}%`
      };
    })
  );

  return {
    timeframe,
    leaderboard: leaderboardWithDetails
  };
};

/**
 * Get prediction statistics
 * @param {Object} queryParams - Query parameters for filtering (timeframe, etc.)
 * @returns {Object} - Prediction statistics
 */
const getPredictionStats = async (queryParams) => {
  // Default timeframe to last 30 days if not specified
  const timeframe = queryParams.timeframe || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  // Get counts by status
  const statusStats = await Prediction.aggregate([
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

  // Get narrative with most predictions
  const topNarratives = await Prediction.aggregate([
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
    resolved: 0,
    expired: 0,
    canceled: 0
  };

  statusStats.forEach(stat => {
    formattedStatusStats[stat._id] = stat.count;
  });

  // Get voting stats
  const voteStats = await Prediction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $project: {
        totalVotes: { 
          $sum: { $map: { input: '$votes', as: 'vote', in: { $size: '$$vote' } } } 
        }
      }
    },
    {
      $group: {
        _id: null,
        totalVotes: { $sum: '$totalVotes' },
        predictionsWithVotes: { 
          $sum: { $cond: [{ $gt: ['$totalVotes', 0] }, 1, 0] }
        },
        totalPredictions: { $sum: 1 }
      }
    }
  ]);

  const votingData = voteStats.length > 0 ? voteStats[0] : {
    totalVotes: 0,
    predictionsWithVotes: 0,
    totalPredictions: await Prediction.countDocuments({ createdAt: { $gte: startDate } })
  };

  return {
    timeframe,
    totalCount: votingData.totalPredictions,
    byStatus: formattedStatusStats,
    votes: {
      total: votingData.totalVotes,
      avgVotesPerPrediction: votingData.totalPredictions > 0 
        ? (votingData.totalVotes / votingData.totalPredictions).toFixed(1) 
        : 0,
      percentageWithVotes: votingData.totalPredictions > 0 
        ? ((votingData.predictionsWithVotes / votingData.totalPredictions) * 100).toFixed(1) 
        : 0
    },
    topNarratives
  };
};

module.exports = {
  createPrediction,
  getAllPredictions,
  getTrendingPredictions,
  getPredictionById,
  getUserPredictions,
  getNarrativePredictions,
  updatePrediction,
  deletePrediction,
  votePrediction,
  resolvePrediction,
  cancelPrediction,
  checkExpiredPredictions,
  getPredictionLeaderboard,
  getPredictionStats
}; 