/**
 * Narrative Service
 * 
 * Handles narrative-related business logic
 */

const Narrative = require('../models/Narrative');
const Character = require('../models/Character');
const User = require('../models/User');
const Decision = require('../models/Decision');
const Prediction = require('../models/Prediction');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');
const activityService = require('./activityService');

/**
 * Create a new narrative
 * @param {Object} narrativeData - Narrative data
 * @param {String} userId - User ID creating the narrative
 * @returns {Object} - Created narrative
 */
const createNarrative = async (narrativeData, userId) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Assign the user to the narrative
  narrativeData.creator = userId;

  // Create narrative
  const narrative = await Narrative.create(narrativeData);

  // Log activity
  await activityService.createActivity({
    type: 'narrative_created',
    user: userId,
    narrative: narrative._id,
    importance: 'high',
    description: `${user.username} created narrative "${narrative.title}"`
  });

  return narrative;
};

/**
 * Get all narratives with pagination
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Narratives and pagination info
 */
const getAllNarratives = async (queryParams) => {
  // Build query
  const query = Narrative.find({ isPublic: true });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const narratives = await features.query.populate('creator', 'username');
  await features.countDocuments();

  return {
    data: narratives,
    pagination: features.pagination
  };
};

/**
 * Get featured narratives
 * @param {Number} limit - Number of narratives to return
 * @returns {Array} - Featured narratives
 */
const getFeaturedNarratives = async (limit = 5) => {
  const narratives = await Narrative.find({ 
    isPublic: true,
    isFeatured: true,
    status: { $in: ['active', 'ongoing'] }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('creator', 'username')
    .populate({
      path: 'characters',
      select: 'name type',
      options: { limit: 5 }
    });

  return narratives;
};

/**
 * Get a narrative by ID
 * @param {String} narrativeId - Narrative ID
 * @returns {Object} - Narrative
 */
const getNarrativeById = async (narrativeId) => {
  const narrative = await Narrative.findById(narrativeId)
    .populate('creator', 'username')
    .populate({
      path: 'characters',
      select: 'name type user',
      populate: {
        path: 'user',
        select: 'username'
      }
    })
    .populate({
      path: 'scenes',
      options: {
        sort: { order: 1 }
      }
    });

  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Check if narrative is public
  if (!narrative.isPublic) {
    throw ErrorResponse.forbidden('This narrative is not public');
  }

  return narrative;
};

/**
 * Get a narrative by ID including private fields (for owner/admin)
 * @param {String} narrativeId - Narrative ID
 * @param {String} userId - User ID requesting the narrative
 * @returns {Object} - Narrative with private fields
 */
const getNarrativeByIdAuthorized = async (narrativeId, userId) => {
  // Find narrative
  const narrative = await Narrative.findById(narrativeId)
    .populate('creator', 'username')
    .populate({
      path: 'characters',
      select: 'name type user',
      populate: {
        path: 'user',
        select: 'username'
      }
    })
    .populate({
      path: 'scenes',
      options: {
        sort: { order: 1 }
      }
    });

  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Check authorization
  const user = await User.findById(userId);
  if (narrative.creator.toString() !== userId && !user.isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to view this narrative\'s private fields');
  }

  return narrative;
};

/**
 * Get narratives by user
 * @param {String} userId - User ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - User's narratives and pagination info
 */
const getUserNarratives = async (userId, queryParams) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Build query
  const query = Narrative.find({ creator: userId });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const narratives = await features.query;
  await features.countDocuments();

  return {
    data: narratives,
    pagination: features.pagination
  };
};

/**
 * Get narratives by category
 * @param {String} category - Category name
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Narratives and pagination info
 */
const getNarrativesByCategory = async (category, queryParams) => {
  // Build query
  const query = Narrative.find({
    isPublic: true,
    category: category
  });
  
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const narratives = await features.query.populate('creator', 'username');
  await features.countDocuments();

  return {
    data: narratives,
    pagination: features.pagination
  };
};

/**
 * Get narratives by tag
 * @param {String} tag - Tag name
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Narratives and pagination info
 */
const getNarrativesByTag = async (tag, queryParams) => {
  // Build query
  const query = Narrative.find({
    isPublic: true,
    tags: tag
  });
  
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const narratives = await features.query.populate('creator', 'username');
  await features.countDocuments();

  return {
    data: narratives,
    pagination: features.pagination
  };
};

/**
 * Update a narrative
 * @param {String} narrativeId - Narrative ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID making the update
 * @returns {Object} - Updated narrative
 */
const updateNarrative = async (narrativeId, updateData, userId) => {
  // Find narrative
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Check ownership or admin
  if (narrative.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to update this narrative');
  }

  // Prevent updating certain fields based on status
  if (narrative.status === 'completed' || narrative.status === 'archived') {
    const allowedFields = ['description', 'isPublic', 'tags'];
    
    for (const field in updateData) {
      if (!allowedFields.includes(field)) {
        throw ErrorResponse.conflict(`Cannot update field "${field}" for a completed or archived narrative`);
      }
    }
  }

  // Update narrative
  Object.keys(updateData).forEach(key => {
    narrative[key] = updateData[key];
  });

  narrative.updatedAt = Date.now();
  await narrative.save();

  // Log activity
  await activityService.createActivity({
    type: 'narrative_updated',
    user: userId,
    narrative: narrative._id,
    importance: 'medium',
    description: `Narrative "${narrative.title}" was updated`
  });

  return narrative;
};

/**
 * Delete a narrative
 * @param {String} narrativeId - Narrative ID
 * @param {String} userId - User ID making the deletion
 * @returns {Object} - Deletion status
 */
const deleteNarrative = async (narrativeId, userId) => {
  // Find narrative
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Check ownership or admin
  if (narrative.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to delete this narrative');
  }

  // Check if there are active decisions or predictions
  const activeDecisions = await Decision.countDocuments({
    narrative: narrativeId,
    status: { $in: ['active', 'pending'] }
  });

  const activePredictions = await Prediction.countDocuments({
    narrative: narrativeId,
    status: { $in: ['active', 'voting'] }
  });

  if (activeDecisions > 0 || activePredictions > 0) {
    throw ErrorResponse.conflict(
      'Cannot delete narrative with active decisions or predictions. ' +
      'Please resolve them first or archive the narrative instead.'
    );
  }

  // Update characters to remove this narrative
  await Character.updateMany(
    { narratives: narrativeId },
    { $pull: { narratives: narrativeId } }
  );

  // Delete narrative
  await narrative.remove();

  // Log activity
  await activityService.createActivity({
    type: 'narrative_deleted',
    user: userId,
    importance: 'high',
    description: `Narrative "${narrative.title}" was deleted`
  });

  return { success: true, message: 'Narrative successfully deleted' };
};

/**
 * Add a scene to a narrative
 * @param {String} narrativeId - Narrative ID
 * @param {Object} sceneData - Scene data
 * @param {String} userId - User ID making the addition
 * @returns {Object} - Updated narrative
 */
const addScene = async (narrativeId, sceneData, userId) => {
  // Find narrative
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Check ownership or admin
  if (narrative.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to add scenes to this narrative');
  }

  // Check if narrative is editable
  if (narrative.status === 'completed' || narrative.status === 'archived') {
    throw ErrorResponse.conflict('Cannot add scenes to a completed or archived narrative');
  }

  // Get the next order number
  const nextOrder = narrative.scenes.length > 0
    ? Math.max(...narrative.scenes.map(scene => scene.order)) + 1
    : 1;

  // Add order if not provided
  if (!sceneData.order) {
    sceneData.order = nextOrder;
  }

  // Add scene
  narrative.scenes.push(sceneData);
  await narrative.save();

  // Log activity
  await activityService.createActivity({
    type: 'scene_added',
    user: userId,
    narrative: narrative._id,
    importance: 'medium',
    description: `New scene added to narrative "${narrative.title}"`
  });

  return narrative;
};

/**
 * Update a scene in a narrative
 * @param {String} narrativeId - Narrative ID
 * @param {String} sceneId - Scene ID
 * @param {Object} updateData - Scene update data
 * @param {String} userId - User ID making the update
 * @returns {Object} - Updated narrative
 */
const updateScene = async (narrativeId, sceneId, updateData, userId) => {
  // Find narrative
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Check ownership or admin
  if (narrative.creator.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to update scenes in this narrative');
  }

  // Check if narrative is editable
  if (narrative.status === 'completed' || narrative.status === 'archived') {
    throw ErrorResponse.conflict('Cannot update scenes in a completed or archived narrative');
  }

  // Find scene
  const sceneIndex = narrative.scenes.findIndex(scene => scene._id.toString() === sceneId);
  if (sceneIndex === -1) {
    throw ErrorResponse.notFound('Scene not found in this narrative');
  }

  // Update scene
  Object.keys(updateData).forEach(key => {
    narrative.scenes[sceneIndex][key] = updateData[key];
  });

  narrative.updatedAt = Date.now();
  await narrative.save();

  // Log activity
  await activityService.createActivity({
    type: 'scene_updated',
    user: userId,
    narrative: narrative._id,
    importance: 'low',
    description: `Scene updated in narrative "${narrative.title}"`
  });

  return narrative;
};

/**
 * Search narratives
 * @param {String} searchQuery - Search query
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Search results and pagination info
 */
const searchNarratives = async (searchQuery, queryParams) => {
  if (!searchQuery) {
    throw ErrorResponse.badRequest('Search query is required');
  }

  // Build query
  const query = Narrative.find({
    isPublic: true,
    $or: [
      { title: { $regex: searchQuery, $options: 'i' } },
      { description: { $regex: searchQuery, $options: 'i' } },
      { category: { $regex: searchQuery, $options: 'i' } },
      { tags: { $regex: searchQuery, $options: 'i' } }
    ]
  });

  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const narratives = await features.query.populate('creator', 'username');
  await features.countDocuments();

  return {
    data: narratives,
    pagination: features.pagination
  };
};

/**
 * Get narrative statistics
 * @param {String} narrativeId - Narrative ID
 * @returns {Object} - Narrative statistics
 */
const getNarrativeStats = async (narrativeId) => {
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Get character count
  const characterCount = narrative.characters.length;

  // Get scene count
  const sceneCount = narrative.scenes.length;

  // Get decisions
  const decisionsCount = await Decision.countDocuments({
    narrative: narrativeId
  });

  const activeDecisionsCount = await Decision.countDocuments({
    narrative: narrativeId,
    status: { $in: ['active', 'pending'] }
  });

  // Get predictions
  const predictionsCount = await Prediction.countDocuments({
    narrative: narrativeId
  });

  const activePredictionsCount = await Prediction.countDocuments({
    narrative: narrativeId,
    status: { $in: ['active', 'voting'] }
  });

  return {
    narrative: {
      id: narrative._id,
      title: narrative.title,
      category: narrative.category,
      status: narrative.status,
      createdAt: narrative.createdAt
    },
    stats: {
      characterCount,
      sceneCount,
      decisionsCount,
      activeDecisionsCount,
      predictionsCount,
      activePredictionsCount
    }
  };
};

module.exports = {
  createNarrative,
  getAllNarratives,
  getFeaturedNarratives,
  getNarrativeById,
  getNarrativeByIdAuthorized,
  getUserNarratives,
  getNarrativesByCategory,
  getNarrativesByTag,
  updateNarrative,
  deleteNarrative,
  addScene,
  updateScene,
  searchNarratives,
  getNarrativeStats
}; 