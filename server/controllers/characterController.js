/**
 * Character Controller
 * 
 * Handles character creation, retrieval, updates, and management.
 */

const Character = require('../models/Character');
const User = require('../models/User');
const Narrative = require('../models/Narrative');
const Decision = require('../models/Decision');
const Prediction = require('../models/Prediction');
const Activity = require('../models/Activity');
const { initializeAIServices } = require('../../ai');

/**
 * Get all characters with filtering
 * @route GET /api/characters
 */
exports.getAllCharacters = async (req, res) => {
  try {
    const {
      type,
      isNPC = 'false',
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    // Filter by type if provided
    if (type) {
      filter.type = type;
    }
    
    // Filter by NPC status
    filter.isNPC = isNPC === 'true';

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get characters
    const characters = await Character.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username')
      .select('-abilities -traits -narratives.notes')
      .lean();

    // Get total count for pagination
    const total = await Character.countDocuments(filter);

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
    console.error('Error fetching characters:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch characters',
      error: err.message
    });
  }
};

/**
 * Get current user's characters
 * @route GET /api/characters/user
 */
exports.getUserCharacters = async (req, res) => {
  try {
    const { active, type, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    
    // Filter by type if provided
    if (type) {
      filter.type = type;
    }
    
    // Filter by active status
    if (active === 'true') {
      filter['narratives.active'] = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get characters
    const characters = await Character.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Character.countDocuments(filter);

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
    console.error('Error fetching user characters:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch your characters',
      error: err.message
    });
  }
};

/**
 * Get available character types
 * @route GET /api/characters/types
 */
exports.getCharacterTypes = async (req, res) => {
  try {
    // This would typically come from a database or configuration
    // For now, we'll return a static list
    const characterTypes = [
      {
        id: 'politician',
        name: 'Politician',
        description: 'Government officials and political leaders',
        abilities: ['Influence', 'Rhetoric', 'Policy'],
        startingStats: {
          influence: 8,
          resources: 5,
          specialties: ['Diplomacy', 'Public Speaking']
        }
      },
      {
        id: 'business_leader',
        name: 'Business Leader',
        description: 'CEOs, entrepreneurs, and corporate executives',
        abilities: ['Investment', 'Strategy', 'Networking'],
        startingStats: {
          influence: 6,
          resources: 9,
          specialties: ['Finance', 'Management']
        }
      },
      {
        id: 'journalist',
        name: 'Journalist',
        description: 'Reporters, writers, and media professionals',
        abilities: ['Investigation', 'Communication', 'Source Network'],
        startingStats: {
          influence: 5,
          resources: 4,
          specialties: ['Research', 'Writing']
        }
      },
      {
        id: 'activist',
        name: 'Activist',
        description: 'Social change advocates and organizers',
        abilities: ['Mobilization', 'Awareness', 'Civil Action'],
        startingStats: {
          influence: 4,
          resources: 3,
          specialties: ['Organizing', 'Advocacy']
        }
      },
      {
        id: 'scientist',
        name: 'Scientist',
        description: 'Researchers and technical experts',
        abilities: ['Analysis', 'Innovation', 'Technical Knowledge'],
        startingStats: {
          influence: 3,
          resources: 6,
          specialties: ['Research', 'Technical']
        }
      }
    ];

    res.json({
      status: 'success',
      data: characterTypes
    });
  } catch (err) {
    console.error('Error fetching character types:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch character types',
      error: err.message
    });
  }
};

/**
 * Search characters
 * @route GET /api/characters/search
 */
exports.searchCharacters = async (req, res) => {
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
        { name: { $regex: query, $options: 'i' } },
        { type: { $regex: query, $options: 'i' } },
        { background: { $regex: query, $options: 'i' } }
      ],
      isNPC: false // Only search for player characters
    };

    const characters = await Character.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username')
      .select('-abilities -traits -narratives.notes')
      .lean();

    // Get total count for pagination
    const total = await Character.countDocuments(searchQuery);

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
    console.error(`Error searching characters with query ${req.query.query}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search characters',
      error: err.message
    });
  }
};

/**
 * Get character by ID
 * @route GET /api/characters/:id
 */
exports.getCharacterById = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeAbilities = 'true', includeTraits = 'true' } = req.query;

    // Build projection
    const projection = {};
    if (includeAbilities === 'false') projection.abilities = 0;
    if (includeTraits === 'false') projection.traits = 0;

    const character = await Character.findById(id, projection)
      .populate('user', 'username')
      .populate('narratives.narrative', 'title summary')
      .lean();

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    res.json({
      status: 'success',
      data: character
    });
  } catch (err) {
    console.error(`Error fetching character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch character',
      error: err.message
    });
  }
};

/**
 * Create a new character
 * @route POST /api/characters
 */
exports.createCharacter = async (req, res) => {
  try {
    const {
      name,
      type,
      specialty,
      avatar,
      background,
      goals,
      personalityTraits,
      abilities,
      isNPC = false
    } = req.body;

    // Create character
    const character = await Character.create({
      name,
      type,
      specialty,
      avatar,
      background,
      goals,
      personalityTraits,
      abilities,
      isNPC,
      user: req.user._id
    });

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: character._id,
      type: 'character_created',
      title: 'Character Created',
      description: `User created character "${name}"`,
      importance: 'medium'
    });

    res.status(201).json({
      status: 'success',
      message: 'Character created successfully',
      data: character
    });
  } catch (err) {
    console.error('Error creating character:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create character',
      error: err.message
    });
  }
};

/**
 * Generate a character
 * @route POST /api/characters/generate
 */
exports.generateCharacter = async (req, res) => {
  try {
    const {
      narrativeId,
      characterType,
      role,
      specialtyFocus
    } = req.body;

    if (!narrativeId || !characterType) {
      return res.status(400).json({
        status: 'error',
        message: 'Narrative ID and character type are required'
      });
    }

    // Check if narrative exists
    const narrative = await Narrative.findById(narrativeId);
    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Initialize AI services
    const ai = initializeAIServices();
    
    // Generate character
    const characterData = await ai.characterGenerator.generateCharacterTemplate({
      narrativeId,
      characterType,
      role,
      specialtyFocus
    });
    
    // Add user to character data
    characterData.user = req.user._id;
    
    // Add narrative reference
    characterData.narratives = [{
      narrative: narrativeId,
      joinedAt: Date.now(),
      active: true
    }];
    
    // Store the character in the database
    const character = await Character.create(characterData);

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: character._id,
      type: 'character_generated',
      title: 'Character Generated',
      description: `AI generated character "${character.name}" for narrative "${narrative.title}"`,
      importance: 'medium',
      relatedEntities: {
        narrative: narrative._id,
        character: character._id
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Character generated successfully',
      data: character
    });
  } catch (err) {
    console.error('Error generating character:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate character',
      error: err.message
    });
  }
};

/**
 * Update a character
 * @route PUT /api/characters/:id
 */
exports.updateCharacter = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      avatar,
      background,
      goals,
      personalityTraits
    } = req.body;

    // Find character
    const character = await Character.findById(id);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Check ownership
    if (character.user.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this character'
      });
    }

    // Update character
    const updatedCharacter = await Character.findByIdAndUpdate(
      id,
      {
        name,
        avatar,
        background,
        goals,
        personalityTraits,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: updatedCharacter._id,
      type: 'character_updated',
      title: 'Character Updated',
      description: `User updated character "${updatedCharacter.name}"`,
      importance: 'low'
    });

    res.json({
      status: 'success',
      message: 'Character updated successfully',
      data: updatedCharacter
    });
  } catch (err) {
    console.error(`Error updating character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update character',
      error: err.message
    });
  }
};

/**
 * Delete a character
 * @route DELETE /api/characters/:id
 */
exports.deleteCharacter = async (req, res) => {
  try {
    const { id } = req.params;

    // Find character
    const character = await Character.findById(id);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Check ownership
    if (character.user.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this character'
      });
    }

    // Check for active decisions or predictions
    const activeDecisions = await Decision.countDocuments({
      character: id,
      status: { $in: ['pending', 'active'] }
    });

    const activePredictions = await Prediction.countDocuments({
      character: id,
      status: { $in: ['pending', 'active'] }
    });

    if (activeDecisions > 0 || activePredictions > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete character with active decisions or predictions'
      });
    }

    // Delete character
    await character.delete();

    // Delete related records
    await Promise.all([
      Decision.deleteMany({ character: id }),
      Prediction.deleteMany({ character: id }),
      Activity.updateMany(
        { character: id },
        { $unset: { character: 1 } }
      )
    ]);

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'character_deleted',
      title: 'Character Deleted',
      description: `User deleted character "${character.name}"`,
      importance: 'high'
    });

    res.json({
      status: 'success',
      message: 'Character deleted successfully'
    });
  } catch (err) {
    console.error(`Error deleting character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete character',
      error: err.message
    });
  }
};

/**
 * Get character decisions
 * @route GET /api/characters/:id/decisions
 */
exports.getCharacterDecisions = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Find character
    const character = await Character.findById(id);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { character: id };
    
    if (status) {
      query.status = status;
    }

    // Find decisions
    const decisions = await Decision.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('narrative', 'title')
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
    console.error(`Error fetching decisions for character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch character decisions',
      error: err.message
    });
  }
};

/**
 * Get character predictions
 * @route GET /api/characters/:id/predictions
 */
exports.getCharacterPredictions = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Find character
    const character = await Character.findById(id);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = { character: id };
    
    if (status) {
      query.status = status;
    }

    // Find predictions
    const predictions = await Prediction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('narrative', 'title')
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
    console.error(`Error fetching predictions for character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch character predictions',
      error: err.message
    });
  }
};

/**
 * Get character activity history
 * @route GET /api/characters/:id/activities
 */
exports.getCharacterActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Find character
    const character = await Character.findById(id);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find activities
    const activities = await Activity.find({ character: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username')
      .lean();

    // Get total count for pagination
    const total = await Activity.countDocuments({ character: id });

    res.json({
      status: 'success',
      data: {
        activities,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error(`Error fetching activities for character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch character activities',
      error: err.message
    });
  }
};

/**
 * Get narratives character is participating in
 * @route GET /api/characters/:id/narratives
 */
exports.getCharacterNarratives = async (req, res) => {
  try {
    const { id } = req.params;
    const { active = 'true' } = req.query;

    // Find character
    const character = await Character.findById(id)
      .populate({
        path: 'narratives.narrative',
        select: 'title summary category tags status'
      })
      .select('narratives')
      .lean();

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Filter by active status if requested
    let narratives = character.narratives;
    if (active === 'true') {
      narratives = narratives.filter(n => n.active);
    }

    res.json({
      status: 'success',
      data: narratives
    });
  } catch (err) {
    console.error(`Error fetching narratives for character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch character narratives',
      error: err.message
    });
  }
};

/**
 * Use a character ability
 * @route POST /api/characters/:id/abilities/:abilityId/use
 */
exports.useAbility = async (req, res) => {
  try {
    const { id, abilityId } = req.params;
    const { narrativeId, target, context } = req.body;

    if (!narrativeId) {
      return res.status(400).json({
        status: 'error',
        message: 'Narrative ID is required'
      });
    }

    // Find character
    const character = await Character.findById(id);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Check ownership
    if (character.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to use this character'
      });
    }

    // Find ability
    const ability = character.abilities.find(a => a._id.toString() === abilityId);

    if (!ability) {
      return res.status(404).json({
        status: 'error',
        message: 'Ability not found'
      });
    }

    // Check if ability is on cooldown
    if (ability.lastUsed && Date.now() - ability.lastUsed < ability.cooldown * 1000) {
      return res.status(400).json({
        status: 'error',
        message: `Ability is on cooldown. Available in ${Math.ceil((ability.lastUsed + ability.cooldown * 1000 - Date.now()) / 1000)} seconds.`
      });
    }

    // Check if character is in the narrative
    const narrativeIndex = character.narratives.findIndex(
      n => n.narrative.toString() === narrativeId && n.active
    );

    if (narrativeIndex === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'Character is not active in this narrative'
      });
    }

    // Update ability usage
    ability.lastUsed = Date.now();
    ability.usageCount = (ability.usageCount || 0) + 1;
    await character.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: character._id,
      type: 'ability_used',
      title: 'Ability Used',
      description: `Character "${character.name}" used ability "${ability.name}"`,
      importance: 'low',
      relatedEntities: {
        narrative: narrativeId
      },
      metadata: {
        ability: ability.name,
        target,
        context
      }
    });

    res.json({
      status: 'success',
      message: 'Ability used successfully',
      data: {
        ability,
        effect: `${ability.name} was used successfully.`
      }
    });
  } catch (err) {
    console.error(`Error using ability for character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to use ability',
      error: err.message
    });
  }
};

/**
 * Get narrative recommendations for a character
 * @route GET /api/characters/:id/recommendations
 */
exports.getNarrativeRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    // Find character
    const character = await Character.findById(id);

    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    // Check ownership
    if (character.user.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view recommendations for this character'
      });
    }

    // Get narratives the character is already in
    const activeNarrativeIds = character.narratives
      .filter(n => n.active)
      .map(n => n.narrative);

    // Find narratives matching character type and specialty
    const recommendedNarratives = await Narrative.find({
      _id: { $nin: activeNarrativeIds },
      status: 'active',
      visibility: 'public',
      $or: [
        { category: character.type },
        { tags: { $in: [character.specialty] } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('title summary category tags')
      .lean();

    // Calculate match score
    const narrativesWithScore = recommendedNarratives.map(narrative => {
      let score = 0;
      
      // Category match
      if (narrative.category === character.type) {
        score += 10;
      }
      
      // Tag matches
      const specialtyMatch = narrative.tags.includes(character.specialty);
      if (specialtyMatch) {
        score += 5;
      }
      
      // Calculate percentage match
      const matchPercentage = Math.min(Math.round((score / 15) * 100), 100);
      
      return {
        ...narrative,
        matchScore: matchPercentage
      };
    });

    // Sort by match score
    narrativesWithScore.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      status: 'success',
      data: narrativesWithScore
    });
  } catch (err) {
    console.error(`Error getting recommendations for character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get narrative recommendations',
      error: err.message
    });
  }
};

/**
 * Mint character as NFT
 * @route POST /api/characters/:id/mint-nft
 */
exports.mintCharacterNFT = async (req, res) => {
  try {
    const { id } = req.params;
    
    // This is a placeholder for blockchain integration
    // In a real implementation, we would:
    // 1. Find the character
    // 2. Check ownership
    // 3. Generate metadata JSON
    // 4. Upload to IPFS
    // 5. Call smart contract to mint NFT
    // 6. Update character with NFT info
    
    res.json({
      status: 'info',
      message: 'NFT minting is not implemented yet',
      data: {
        characterId: id,
        feature: 'coming soon'
      }
    });
  } catch (err) {
    console.error(`Error minting NFT for character with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mint character NFT',
      error: err.message
    });
  }
}; 