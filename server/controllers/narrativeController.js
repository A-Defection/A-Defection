/**
 * Narrative Controller
 * 
 * Handles narrative creation, retrieval, updates, and interactions.
 */

const Narrative = require('../models/Narrative');
const Character = require('../models/Character');
const Decision = require('../models/Decision');
const Prediction = require('../models/Prediction');
const Activity = require('../models/Activity');
const { initializeAIServices } = require('../../ai');

/**
 * Get all narratives with filtering
 * @route GET /api/narratives
 */
exports.getAllNarratives = async (req, res) => {
  try {
    const {
      status = 'active',
      visibility = 'public',
      category,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    // Filter by status if provided
    if (status !== 'all') {
      filter.status = status;
    }
    
    // Filter by visibility
    if (visibility !== 'all') {
      filter.visibility = visibility;
    }
    
    // Filter by category if provided
    if (category) {
      filter.category = category;
    }
    
    // Filter by tags if provided
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get narratives
    const narratives = await Narrative.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('generatedBy', 'name version')
      .populate('parentNarrative', 'title')
      .lean();

    // Get total count for pagination
    const total = await Narrative.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        narratives,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error('Error fetching narratives:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narratives',
      error: err.message
    });
  }
};

/**
 * Get featured narratives
 * @route GET /api/narratives/featured
 */
exports.getFeaturedNarratives = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const narratives = await Narrative.find({
      status: 'active',
      visibility: 'public',
      featured: true
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('generatedBy', 'name version')
      .lean();

    res.json({
      status: 'success',
      data: narratives
    });
  } catch (err) {
    console.error('Error fetching featured narratives:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch featured narratives',
      error: err.message
    });
  }
};

/**
 * Get narratives by category
 * @route GET /api/narratives/categories/:category
 */
exports.getNarrativesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const narratives = await Narrative.find({
      category,
      status: 'active',
      visibility: 'public'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('generatedBy', 'name version')
      .lean();

    // Get total count for pagination
    const total = await Narrative.countDocuments({
      category,
      status: 'active',
      visibility: 'public'
    });

    res.json({
      status: 'success',
      data: {
        narratives,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error(`Error fetching narratives by category ${req.params.category}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narratives by category',
      error: err.message
    });
  }
};

/**
 * Get narratives by tag
 * @route GET /api/narratives/tags/:tag
 */
exports.getNarrativesByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const narratives = await Narrative.find({
      tags: tag,
      status: 'active',
      visibility: 'public'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('generatedBy', 'name version')
      .lean();

    // Get total count for pagination
    const total = await Narrative.countDocuments({
      tags: tag,
      status: 'active',
      visibility: 'public'
    });

    res.json({
      status: 'success',
      data: {
        narratives,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error(`Error fetching narratives by tag ${req.params.tag}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narratives by tag',
      error: err.message
    });
  }
};

/**
 * Search narratives
 * @route GET /api/narratives/search
 */
exports.searchNarratives = async (req, res) => {
  try {
    const { query, page = 1, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build text search query
    const searchQuery = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } }
      ],
      status: 'active',
      visibility: 'public'
    };

    const narratives = await Narrative.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('generatedBy', 'name version')
      .lean();

    // Get total count for pagination
    const total = await Narrative.countDocuments(searchQuery);

    res.json({
      status: 'success',
      data: {
        narratives,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error(`Error searching narratives with query ${req.query.query}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search narratives',
      error: err.message
    });
  }
};

/**
 * Get narrative by ID
 * @route GET /api/narratives/:id
 */
exports.getNarrativeById = async (req, res) => {
  try {
    const { id } = req.params;

    const narrative = await Narrative.findById(id)
      .populate('generatedBy', 'name version')
      .populate('parentNarrative', 'title')
      .populate('childNarratives', 'title summary')
      .lean();

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // If narrative is private, check if user is authorized
    if (narrative.visibility === 'private' && (!req.user || narrative.createdBy.toString() !== req.user._id.toString())) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view this narrative'
      });
    }

    res.json({
      status: 'success',
      data: narrative
    });
  } catch (err) {
    console.error(`Error fetching narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narrative',
      error: err.message
    });
  }
};

/**
 * Create a new narrative
 * @route POST /api/narratives
 */
exports.createNarrative = async (req, res) => {
  try {
    const {
      title,
      summary,
      description,
      category,
      tags,
      visibility,
      newsReferences,
      timeline,
      locations,
      scenes,
      parentNarrativeId
    } = req.body;

    // Create narrative
    const narrative = await Narrative.create({
      title,
      summary,
      description,
      category,
      tags: Array.isArray(tags) ? tags : tags?.split(',').map(tag => tag.trim()),
      visibility: visibility || 'public',
      newsReferences,
      timeline,
      locations,
      scenes,
      parentNarrative: parentNarrativeId,
      createdBy: req.user._id
    });

    // If this is a child narrative, update parent narrative
    if (parentNarrativeId) {
      await Narrative.findByIdAndUpdate(parentNarrativeId, {
        $push: { childNarratives: narrative._id }
      });
    }

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'narrative_created',
      title: 'Narrative Created',
      description: `User created narrative "${title}"`,
      importance: 'medium',
      relatedEntities: {
        narrative: narrative._id
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Narrative created successfully',
      data: narrative
    });
  } catch (err) {
    console.error('Error creating narrative:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create narrative',
      error: err.message
    });
  }
};

/**
 * Generate a narrative from news
 * @route POST /api/narratives/generate
 */
exports.generateNarrative = async (req, res) => {
  try {
    const { topic, category, complexity = 'medium' } = req.body;

    if (!topic) {
      return res.status(400).json({
        status: 'error',
        message: 'Topic is required for narrative generation'
      });
    }

    // Initialize AI services
    const ai = initializeAIServices();
    
    // Generate narrative
    const narrativeData = await ai.narrativeGenerator.generateNarrative({
      topic,
      category,
      complexity
    });
    
    // Store the narrative in the database
    const narrative = await Narrative.create({
      ...narrativeData,
      status: 'active',
      visibility: 'public',
      generatedBy: {
        type: 'ai',
        name: 'NarrativeGenerator',
        version: '1.0'
      },
      createdBy: req.user._id
    });

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'narrative_generated',
      title: 'Narrative Generated',
      description: `AI generated narrative "${narrative.title}" based on topic "${topic}"`,
      importance: 'medium',
      relatedEntities: {
        narrative: narrative._id
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Narrative generated successfully',
      data: narrative
    });
  } catch (err) {
    console.error('Error generating narrative:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate narrative',
      error: err.message
    });
  }
};

/**
 * Update a narrative
 * @route PUT /api/narratives/:id
 */
exports.updateNarrative = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      summary,
      description,
      category,
      tags,
      visibility,
      status,
      newsReferences,
      timeline,
      locations,
      scenes
    } = req.body;

    // Find narrative
    const narrative = await Narrative.findById(id);

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Check ownership
    if (narrative.createdBy.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this narrative'
      });
    }

    // Update narrative
    const updatedNarrative = await Narrative.findByIdAndUpdate(
      id,
      {
        title,
        summary,
        description,
        category,
        tags: Array.isArray(tags) ? tags : tags?.split(',').map(tag => tag.trim()),
        visibility,
        status,
        newsReferences,
        timeline,
        locations,
        scenes,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'narrative_updated',
      title: 'Narrative Updated',
      description: `User updated narrative "${updatedNarrative.title}"`,
      importance: 'low',
      relatedEntities: {
        narrative: updatedNarrative._id
      }
    });

    res.json({
      status: 'success',
      message: 'Narrative updated successfully',
      data: updatedNarrative
    });
  } catch (err) {
    console.error(`Error updating narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update narrative',
      error: err.message
    });
  }
};

/**
 * Delete a narrative
 * @route DELETE /api/narratives/:id
 */
exports.deleteNarrative = async (req, res) => {
  try {
    const { id } = req.params;

    // Find narrative
    const narrative = await Narrative.findById(id);

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Check ownership
    if (narrative.createdBy.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this narrative'
      });
    }

    // Check if narrative has active characters
    const activeCharacters = await Character.countDocuments({
      'narratives.narrative': id,
      'narratives.active': true
    });

    if (activeCharacters > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete narrative with active characters. Please remove all characters first.'
      });
    }

    // Delete all related entities
    await Promise.all([
      // Set narrative to inactive in characters (don't delete characters)
      Character.updateMany(
        { 'narratives.narrative': id },
        { $set: { 'narratives.$.active': false } }
      ),
      
      // Delete decisions and predictions
      Decision.deleteMany({ narrative: id }),
      Prediction.deleteMany({ narrative: id }),
      
      // Remove references from parent narrative
      narrative.parentNarrative && Narrative.findByIdAndUpdate(
        narrative.parentNarrative,
        { $pull: { childNarratives: id } }
      ),
      
      // Update child narratives to remove parent reference
      Narrative.updateMany(
        { parentNarrative: id },
        { $unset: { parentNarrative: 1 } }
      )
    ]);

    // Delete narrative
    await narrative.delete();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'narrative_deleted',
      title: 'Narrative Deleted',
      description: `User deleted narrative "${narrative.title}"`,
      importance: 'high'
    });

    res.json({
      status: 'success',
      message: 'Narrative deleted successfully'
    });
  } catch (err) {
    console.error(`Error deleting narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete narrative',
      error: err.message
    });
  }
};

/**
 * Join a narrative with a character
 * @route POST /api/narratives/:id/join
 */
exports.joinNarrative = async (req, res) => {
  try {
    const { id } = req.params;
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({
        status: 'error',
        message: 'Character ID is required'
      });
    }

    // Find narrative
    const narrative = await Narrative.findById(id);

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Check if narrative is active
    if (narrative.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot join an inactive narrative'
      });
    }

    // Find character
    const character = await Character.findById(characterId);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Check if character belongs to user
    if (character.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to use this character'
      });
    }

    // Check if character is already in this narrative
    const existingNarrative = character.narratives.find(
      n => n.narrative.toString() === id
    );

    if (existingNarrative) {
      if (existingNarrative.active) {
        return res.status(400).json({
          status: 'error',
          message: 'Character is already active in this narrative'
        });
      }

      // Re-activate character in narrative
      existingNarrative.active = true;
      await character.save();
    } else {
      // Add narrative to character
      character.narratives.push({
        narrative: id,
        joinedAt: Date.now(),
        active: true
      });
      await character.save();
    }

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: character._id,
      type: 'narrative_joined',
      title: 'Joined Narrative',
      description: `Character "${character.name}" joined narrative "${narrative.title}"`,
      importance: 'medium',
      relatedEntities: {
        narrative: narrative._id,
        character: character._id
      }
    });

    res.json({
      status: 'success',
      message: 'Successfully joined narrative',
      data: {
        character,
        narrative: {
          _id: narrative._id,
          title: narrative.title
        }
      }
    });
  } catch (err) {
    console.error(`Error joining narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to join narrative',
      error: err.message
    });
  }
};

/**
 * Leave a narrative with a character
 * @route POST /api/narratives/:id/leave
 */
exports.leaveNarrative = async (req, res) => {
  try {
    const { id } = req.params;
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({
        status: 'error',
        message: 'Character ID is required'
      });
    }

    // Find character
    const character = await Character.findById(characterId);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Check if character belongs to user
    if (character.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to use this character'
      });
    }

    // Find narrative in character
    const narrativeIndex = character.narratives.findIndex(
      n => n.narrative.toString() === id && n.active
    );

    if (narrativeIndex === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'Character is not active in this narrative'
      });
    }

    // Set narrative to inactive
    character.narratives[narrativeIndex].active = false;
    character.narratives[narrativeIndex].leftAt = Date.now();
    await character.save();

    // Get narrative for activity log
    const narrative = await Narrative.findById(id).select('title');

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: character._id,
      type: 'narrative_left',
      title: 'Left Narrative',
      description: `Character "${character.name}" left narrative "${narrative.title}"`,
      importance: 'medium',
      relatedEntities: {
        narrative: id,
        character: character._id
      }
    });

    res.json({
      status: 'success',
      message: 'Successfully left narrative',
      data: {
        character
      }
    });
  } catch (err) {
    console.error(`Error leaving narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to leave narrative',
      error: err.message
    });
  }
};

/**
 * Get characters in a narrative
 * @route GET /api/narratives/:id/characters
 */
exports.getNarrativeCharacters = async (req, res) => {
  try {
    const { id } = req.params;
    const { active = 'true', page = 1, limit = 20 } = req.query;

    // Find narrative
    const narrative = await Narrative.findById(id);

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      'narratives.narrative': id
    };

    if (active === 'true') {
      query['narratives.active'] = true;
    }

    // Find characters
    const characters = await Character.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username')
      .select('-narratives.narrative -narratives.notes')
      .lean();

    // Get total count for pagination
    const total = await Character.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        characters,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error(`Error fetching characters for narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narrative characters',
      error: err.message
    });
  }
};

/**
 * Get scenes in a narrative
 * @route GET /api/narratives/:id/scenes
 */
exports.getNarrativeScenes = async (req, res) => {
  try {
    const { id } = req.params;

    // Find narrative and select only scenes
    const narrative = await Narrative.findById(id).select('scenes');

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    res.json({
      status: 'success',
      data: narrative.scenes
    });
  } catch (err) {
    console.error(`Error fetching scenes for narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narrative scenes',
      error: err.message
    });
  }
};

/**
 * Get decisions in a narrative
 * @route GET /api/narratives/:id/decisions
 */
exports.getNarrativeDecisions = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Find narrative
    const narrative = await Narrative.findById(id);

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { narrative: id };
    
    if (status) {
      query.status = status;
    }

    // Find decisions
    const decisions = await Decision.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('character', 'name type')
      .populate('user', 'username')
      .lean();

    // Get total count for pagination
    const total = await Decision.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        decisions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error(`Error fetching decisions for narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narrative decisions',
      error: err.message
    });
  }
};

/**
 * Get predictions in a narrative
 * @route GET /api/narratives/:id/predictions
 */
exports.getNarrativePredictions = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Find narrative
    const narrative = await Narrative.findById(id);

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { narrative: id };
    
    if (status) {
      query.status = status;
    }

    // Find predictions
    const predictions = await Prediction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('character', 'name type')
      .populate('user', 'username')
      .lean();

    // Get total count for pagination
    const total = await Prediction.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        predictions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error(`Error fetching predictions for narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narrative predictions',
      error: err.message
    });
  }
};

/**
 * Add a scene to a narrative
 * @route POST /api/narratives/:id/scenes
 */
exports.addScene = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status = 'draft' } = req.body;

    // Find narrative
    const narrative = await Narrative.findById(id);

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Check ownership
    if (narrative.createdBy.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this narrative'
      });
    }

    // Create scene object
    const scene = {
      title,
      description,
      status,
      createdAt: Date.now(),
      order: narrative.scenes.length + 1
    };

    // Add scene to narrative
    narrative.scenes.push(scene);
    await narrative.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'scene_added',
      title: 'Scene Added',
      description: `User added scene "${title}" to narrative "${narrative.title}"`,
      importance: 'low',
      relatedEntities: {
        narrative: narrative._id
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Scene added successfully',
      data: narrative.scenes[narrative.scenes.length - 1]
    });
  } catch (err) {
    console.error(`Error adding scene to narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add scene',
      error: err.message
    });
  }
};

/**
 * Update a scene in a narrative
 * @route PUT /api/narratives/:id/scenes/:sceneId
 */
exports.updateScene = async (req, res) => {
  try {
    const { id, sceneId } = req.params;
    const { title, description, status, order } = req.body;

    // Find narrative
    const narrative = await Narrative.findById(id);

    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Check ownership
    if (narrative.createdBy.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this narrative'
      });
    }

    // Find scene
    const scene = narrative.scenes.id(sceneId);

    if (!scene) {
      return res.status(404).json({
        status: 'error',
        message: 'Scene not found'
      });
    }

    // Update scene
    if (title) scene.title = title;
    if (description) scene.description = description;
    if (status) scene.status = status;
    if (order) scene.order = order;
    scene.updatedAt = Date.now();

    await narrative.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'scene_updated',
      title: 'Scene Updated',
      description: `User updated scene "${scene.title}" in narrative "${narrative.title}"`,
      importance: 'low',
      relatedEntities: {
        narrative: narrative._id
      }
    });

    res.json({
      status: 'success',
      message: 'Scene updated successfully',
      data: scene
    });
  } catch (err) {
    console.error(`Error updating scene in narrative with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update scene',
      error: err.message
    });
  }
};

// Additional controller methods will be implemented in part 2 