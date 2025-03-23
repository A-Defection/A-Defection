/**
 * Character Service
 * 
 * Handles character-related business logic
 */

const Character = require('../models/Character');
const User = require('../models/User');
const Narrative = require('../models/Narrative');
const Activity = require('../models/Activity');
const ErrorResponse = require('../utils/errorResponse');
const APIFeatures = require('../utils/apiFeatures');
const activityService = require('./activityService');

/**
 * Create a new character
 * @param {Object} characterData - Character data
 * @param {String} userId - User ID creating the character
 * @returns {Object} - Created character
 */
const createCharacter = async (characterData, userId) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Assign the user to the character
  characterData.user = userId;

  // Create character
  const character = await Character.create(characterData);

  // Log activity
  await activityService.createActivity({
    type: 'character_created',
    user: userId,
    character: character._id,
    importance: 'medium',
    description: `${user.username} created character ${character.name}`
  });

  return character;
};

/**
 * Get all characters with pagination
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Characters and pagination info
 */
const getAllCharacters = async (queryParams) => {
  // Build query
  const query = Character.find();
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const characters = await features.query.populate('user', 'username');
  await features.countDocuments();

  return {
    data: characters,
    pagination: features.pagination
  };
};

/**
 * Get a character by ID
 * @param {String} characterId - Character ID
 * @returns {Object} - Character
 */
const getCharacterById = async (characterId) => {
  const character = await Character.findById(characterId)
    .populate('user', 'username')
    .populate('narratives', 'title');

  if (!character) {
    throw ErrorResponse.notFound('Character not found');
  }

  return character;
};

/**
 * Get all characters for a user
 * @param {String} userId - User ID
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - User's characters and pagination info
 */
const getUserCharacters = async (userId, queryParams) => {
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Build query
  const query = Character.find({ user: userId });
  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const characters = await features.query;
  await features.countDocuments();

  return {
    data: characters,
    pagination: features.pagination
  };
};

/**
 * Update a character
 * @param {String} characterId - Character ID
 * @param {Object} updateData - Update data
 * @param {String} userId - User ID making the update
 * @returns {Object} - Updated character
 */
const updateCharacter = async (characterId, updateData, userId) => {
  // Find character
  const character = await Character.findById(characterId);
  if (!character) {
    throw ErrorResponse.notFound('Character not found');
  }

  // Check ownership or admin
  if (character.user.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to update this character');
  }

  // Update character
  Object.keys(updateData).forEach(key => {
    character[key] = updateData[key];
  });

  character.updatedAt = Date.now();
  await character.save();

  // Log activity
  await activityService.createActivity({
    type: 'character_updated',
    user: userId,
    character: character._id,
    importance: 'low',
    description: `Character ${character.name} was updated`
  });

  return character;
};

/**
 * Delete a character
 * @param {String} characterId - Character ID
 * @param {String} userId - User ID making the deletion
 * @returns {Object} - Deletion status
 */
const deleteCharacter = async (characterId, userId) => {
  // Find character
  const character = await Character.findById(characterId);
  if (!character) {
    throw ErrorResponse.notFound('Character not found');
  }

  // Check ownership or admin
  if (character.user.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to delete this character');
  }

  // Check if character is in any active narratives
  if (character.narratives && character.narratives.length > 0) {
    // Get active narratives that contain this character
    const activeNarratives = await Narrative.find({
      _id: { $in: character.narratives },
      status: { $in: ['active', 'ongoing'] }
    });

    if (activeNarratives.length > 0) {
      throw ErrorResponse.conflict(
        'Cannot delete character that is participating in active narratives. ' +
        'Please remove character from these narratives first.'
      );
    }
  }

  // Delete character
  await character.remove();

  // Log activity
  await activityService.createActivity({
    type: 'character_deleted',
    user: userId,
    importance: 'medium',
    description: `Character ${character.name} was deleted`
  });

  return { success: true, message: 'Character successfully deleted' };
};

/**
 * Add character to a narrative
 * @param {String} characterId - Character ID
 * @param {String} narrativeId - Narrative ID
 * @param {String} userId - User ID making the request
 * @returns {Object} - Updated character
 */
const addCharacterToNarrative = async (characterId, narrativeId, userId) => {
  // Find character
  const character = await Character.findById(characterId);
  if (!character) {
    throw ErrorResponse.notFound('Character not found');
  }

  // Check ownership or admin
  if (character.user.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to use this character');
  }

  // Find narrative
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Check if narrative is accepting new characters
  if (narrative.status !== 'active' && narrative.status !== 'pending') {
    throw ErrorResponse.conflict('This narrative is not accepting new characters');
  }

  // Check if character is already in the narrative
  if (character.narratives.includes(narrativeId)) {
    throw ErrorResponse.conflict('Character is already in this narrative');
  }

  // Add narrative to character's narratives
  character.narratives.push(narrativeId);
  await character.save();

  // Add character to narrative's characters
  if (!narrative.characters.includes(characterId)) {
    narrative.characters.push(characterId);
    await narrative.save();
  }

  // Log activity
  await activityService.createActivity({
    type: 'character_joined_narrative',
    user: userId,
    character: character._id,
    narrative: narrative._id,
    importance: 'medium',
    description: `${character.name} joined the narrative "${narrative.title}"`
  });

  return character;
};

/**
 * Remove character from a narrative
 * @param {String} characterId - Character ID
 * @param {String} narrativeId - Narrative ID
 * @param {String} userId - User ID making the request
 * @returns {Object} - Updated character
 */
const removeCharacterFromNarrative = async (characterId, narrativeId, userId) => {
  // Find character
  const character = await Character.findById(characterId);
  if (!character) {
    throw ErrorResponse.notFound('Character not found');
  }

  // Check ownership or admin
  if (character.user.toString() !== userId && !(await User.findById(userId)).isAdmin) {
    throw ErrorResponse.forbidden('You are not authorized to manage this character');
  }

  // Find narrative
  const narrative = await Narrative.findById(narrativeId);
  if (!narrative) {
    throw ErrorResponse.notFound('Narrative not found');
  }

  // Check if character is in the narrative
  if (!character.narratives.includes(narrativeId)) {
    throw ErrorResponse.conflict('Character is not in this narrative');
  }

  // Check if narrative has ended
  if (narrative.status === 'completed' || narrative.status === 'archived') {
    throw ErrorResponse.conflict('Cannot leave a completed or archived narrative');
  }

  // Remove narrative from character's narratives
  character.narratives = character.narratives.filter(
    id => id.toString() !== narrativeId
  );
  await character.save();

  // Remove character from narrative's characters
  narrative.characters = narrative.characters.filter(
    id => id.toString() !== characterId
  );
  await narrative.save();

  // Log activity
  await activityService.createActivity({
    type: 'character_left_narrative',
    user: userId,
    character: character._id,
    narrative: narrative._id,
    importance: 'low',
    description: `${character.name} left the narrative "${narrative.title}"`
  });

  return character;
};

/**
 * Search characters
 * @param {String} searchQuery - Search query
 * @param {Object} queryParams - Query parameters for filtering and pagination
 * @returns {Object} - Search results and pagination info
 */
const searchCharacters = async (searchQuery, queryParams) => {
  if (!searchQuery) {
    throw ErrorResponse.badRequest('Search query is required');
  }

  // Build query
  const query = Character.find({
    $or: [
      { name: { $regex: searchQuery, $options: 'i' } },
      { description: { $regex: searchQuery, $options: 'i' } },
      { 'traits.values': { $regex: searchQuery, $options: 'i' } }
    ]
  });

  const features = new APIFeatures(query, queryParams)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  // Execute query
  const characters = await features.query.populate('user', 'username');
  await features.countDocuments();

  return {
    data: characters,
    pagination: features.pagination
  };
};

/**
 * Get character statistics
 * @param {String} characterId - Character ID
 * @returns {Object} - Character statistics
 */
const getCharacterStats = async (characterId) => {
  const character = await Character.findById(characterId);
  if (!character) {
    throw ErrorResponse.notFound('Character not found');
  }

  // Get activity stats
  const activityCount = await Activity.countDocuments({
    character: characterId
  });

  // Get narrative participation
  const narrativeCount = character.narratives.length;

  // Get decision stats
  const decisionsCount = await Activity.countDocuments({
    character: characterId,
    type: { $in: ['decision_made', 'decision_created'] }
  });

  // Get prediction stats
  const predictionsCount = await Activity.countDocuments({
    character: characterId,
    type: { $in: ['prediction_made', 'prediction_created'] }
  });

  return {
    character: {
      id: character._id,
      name: character.name,
      type: character.type,
      createdAt: character.createdAt
    },
    stats: {
      activityCount,
      narrativeCount,
      decisionsCount,
      predictionsCount
    }
  };
};

module.exports = {
  createCharacter,
  getAllCharacters,
  getCharacterById,
  getUserCharacters,
  updateCharacter,
  deleteCharacter,
  addCharacterToNarrative,
  removeCharacterFromNarrative,
  searchCharacters,
  getCharacterStats
}; 