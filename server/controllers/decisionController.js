/**
 * Decision Controller
 * 
 * Handles decision creation, retrieval, updates, and management.
 */

const Decision = require('../models/Decision');
const Character = require('../models/Character');
const Narrative = require('../models/Narrative');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { initializeAIServices } = require('../../ai');

/**
 * Get all decisions with filtering
 * @route GET /api/decisions
 */
exports.getAllDecisions = async (req, res) => {
  try {
    const {
      status,
      importance,
      narrativeId,
      characterId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (status) filter.status = status;
    if (importance) filter.importance = importance;
    if (narrativeId) filter.narrative = narrativeId;
    if (characterId) filter.character = characterId;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get decisions
    const decisions = await Decision.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('narrative', 'title')
      .populate('character', 'name type')
      .populate('user', 'username')
      .lean();

    // Get total count for pagination
    const total = await Decision.countDocuments(filter);

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
    console.error('Error fetching decisions:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch decisions',
      error: err.message
    });
  }
};

/**
 * Get current user's decisions
 * @route GET /api/decisions/user
 */
exports.getUserDecisions = async (req, res) => {
  try {
    const {
      status,
      characterId,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    
    if (status) filter.status = status;
    if (characterId) filter.character = characterId;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get decisions
    const decisions = await Decision.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('narrative', 'title')
      .populate('character', 'name type')
      .lean();

    // Get total count for pagination
    const total = await Decision.countDocuments(filter);

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
    console.error('Error fetching user decisions:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch your decisions',
      error: err.message
    });
  }
};

/**
 * Get decision by ID
 * @route GET /api/decisions/:id
 */
exports.getDecisionById = async (req, res) => {
  try {
    const { id } = req.params;

    const decision = await Decision.findById(id)
      .populate('narrative', 'title summary')
      .populate('character', 'name type avatar')
      .populate('user', 'username')
      .lean();

    if (!decision) {
      return res.status(404).json({
        status: 'error',
        message: 'Decision not found'
      });
    }

    res.json({
      status: 'success',
      data: decision
    });
  } catch (err) {
    console.error(`Error fetching decision with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch decision',
      error: err.message
    });
  }
};

/**
 * Create a decision
 * @route POST /api/decisions
 */
exports.createDecision = async (req, res) => {
  try {
    const {
      narrativeId,
      characterId,
      sceneId,
      context,
      prompt,
      importance = 'medium',
      timeLimit = 86400 // 24 hours default
    } = req.body;

    // Validate required fields
    if (!narrativeId || !characterId) {
      return res.status(400).json({
        status: 'error',
        message: 'Narrative ID and Character ID are required'
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

    // Check if character exists and belongs to user
    const character = await Character.findById(characterId);
    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    if (character.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to use this character'
      });
    }

    // Check if character is active in narrative
    const isActive = character.narratives.some(
      n => n.narrative.toString() === narrativeId && n.active
    );

    if (!isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Character is not active in this narrative'
      });
    }

    // Create decision
    const decision = await Decision.create({
      narrative: narrativeId,
      character: characterId,
      user: req.user._id,
      sceneId,
      context,
      prompt,
      importance,
      timeLimit,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (timeLimit * 1000)
    });

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: characterId,
      type: 'decision_created',
      title: 'Decision Created',
      description: `User created a decision for character "${character.name}" in narrative "${narrative.title}"`,
      importance: 'medium',
      relatedEntities: {
        narrative: narrativeId,
        character: characterId,
        decision: decision._id
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Decision created successfully',
      data: decision
    });
  } catch (err) {
    console.error('Error creating decision:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create decision',
      error: err.message
    });
  }
};

/**
 * Generate a decision
 * @route POST /api/decisions/generate
 */
exports.generateDecision = async (req, res) => {
  try {
    const {
      narrativeId,
      characterId,
      sceneId,
      importance = 'medium',
      timeLimit
    } = req.body;

    // Validate required fields
    if (!narrativeId || !characterId) {
      return res.status(400).json({
        status: 'error',
        message: 'Narrative ID and Character ID are required'
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

    // Check if character exists and belongs to user
    const character = await Character.findById(characterId);
    if (!character) {
      return res.status(404).json({
        status: 'error',
        message: 'Character not found'
      });
    }

    if (character.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to use this character'
      });
    }

    // Check if character is active in narrative
    const isActive = character.narratives.some(
      n => n.narrative.toString() === narrativeId && n.active
    );

    if (!isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Character is not active in this narrative'
      });
    }

    // Initialize AI services
    const ai = initializeAIServices();
    
    // Generate decision using AI service
    const decisionData = await ai.decisionGenerator.generateDecision({
      narrativeId,
      characterId,
      sceneId,
      importance,
      timeLimit
    });

    // Create decision in database
    const decision = await Decision.create({
      ...decisionData,
      user: req.user._id,
      status: 'active',
      createdAt: Date.now(),
      expiresAt: Date.now() + (decisionData.timeLimit * 1000)
    });

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: characterId,
      type: 'decision_generated',
      title: 'Decision Generated',
      description: `AI generated a decision for character "${character.name}" in narrative "${narrative.title}"`,
      importance: 'medium',
      relatedEntities: {
        narrative: narrativeId,
        character: characterId,
        decision: decision._id
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Decision generated successfully',
      data: decision
    });
  } catch (err) {
    console.error('Error generating decision:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate decision',
      error: err.message
    });
  }
};

/**
 * Choose a decision option
 * @route POST /api/decisions/:id/choose
 */
exports.chooseDecisionOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionId } = req.body;

    if (!optionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Option ID is required'
      });
    }

    // Find decision
    const decision = await Decision.findById(id);
    if (!decision) {
      return res.status(404).json({
        status: 'error',
        message: 'Decision not found'
      });
    }

    // Check if decision belongs to user
    if (decision.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to make this decision'
      });
    }

    // Check if decision is active
    if (decision.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot choose option for ${decision.status} decision`
      });
    }

    // Check if decision is expired
    if (decision.expiresAt && decision.expiresAt < Date.now()) {
      decision.status = 'expired';
      await decision.save();
      
      return res.status(400).json({
        status: 'error',
        message: 'Decision has expired'
      });
    }

    // Find option
    const option = decision.options.find(opt => opt._id.toString() === optionId);
    if (!option) {
      return res.status(404).json({
        status: 'error',
        message: 'Option not found'
      });
    }

    // Check eligibility for option
    const character = await Character.findById(decision.character);
    
    // Initialize AI services
    const ai = initializeAIServices();
    
    // Check if option has requirements that the character doesn't meet
    const isEligible = await ai.decisionGenerator.checkOptionEligibility(character, option);
    
    if (!isEligible) {
      return res.status(400).json({
        status: 'error',
        message: 'Character does not meet the requirements for this option'
      });
    }

    // Update decision with chosen option
    decision.chosenOption = optionId;
    decision.status = 'resolved';
    decision.resolvedAt = Date.now();
    await decision.save();

    // Generate outcomes based on chosen option
    const outcomes = await ai.decisionGenerator.generateOutcomes({
      decision,
      character,
      optionId
    });

    // Apply outcomes to character
    await ai.decisionGenerator.applyOutcomes({
      character,
      outcomes
    });

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: decision.character,
      type: 'decision_resolved',
      title: 'Decision Resolved',
      description: `User chose option "${option.title}" for decision in narrative`,
      importance: 'medium',
      relatedEntities: {
        narrative: decision.narrative,
        character: decision.character,
        decision: decision._id
      }
    });

    res.json({
      status: 'success',
      message: 'Decision option chosen successfully',
      data: {
        decision,
        outcomes
      }
    });
  } catch (err) {
    console.error(`Error choosing option for decision with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to choose decision option',
      error: err.message
    });
  }
};

/**
 * Get decision outcomes
 * @route GET /api/decisions/:id/outcomes
 */
exports.getDecisionOutcomes = async (req, res) => {
  try {
    const { id } = req.params;

    // Find decision
    const decision = await Decision.findById(id).lean();
    if (!decision) {
      return res.status(404).json({
        status: 'error',
        message: 'Decision not found'
      });
    }

    // Check if decision is resolved
    if (decision.status !== 'resolved') {
      return res.status(400).json({
        status: 'error',
        message: 'Decision is not resolved yet'
      });
    }

    // Get outcomes
    const outcomes = decision.outcomes || [];

    res.json({
      status: 'success',
      data: {
        outcomes,
        chosenOption: decision.options.find(opt => opt._id.toString() === decision.chosenOption)
      }
    });
  } catch (err) {
    console.error(`Error fetching outcomes for decision with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch decision outcomes',
      error: err.message
    });
  }
};

/**
 * Cancel a decision
 * @route POST /api/decisions/:id/cancel
 */
exports.cancelDecision = async (req, res) => {
  try {
    const { id } = req.params;

    // Find decision
    const decision = await Decision.findById(id);
    if (!decision) {
      return res.status(404).json({
        status: 'error',
        message: 'Decision not found'
      });
    }

    // Check if decision belongs to user
    if (decision.user.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to cancel this decision'
      });
    }

    // Check if decision can be cancelled
    if (decision.status !== 'active' && decision.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot cancel a ${decision.status} decision`
      });
    }

    // Update decision
    decision.status = 'cancelled';
    decision.resolvedAt = Date.now();
    await decision.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: decision.character,
      type: 'decision_cancelled',
      title: 'Decision Cancelled',
      description: 'User cancelled a decision',
      importance: 'low',
      relatedEntities: {
        narrative: decision.narrative,
        character: decision.character,
        decision: decision._id
      }
    });

    res.json({
      status: 'success',
      message: 'Decision cancelled successfully'
    });
  } catch (err) {
    console.error(`Error cancelling decision with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel decision',
      error: err.message
    });
  }
};

/**
 * Extend decision time limit
 * @route POST /api/decisions/:id/extend
 */
exports.extendDecisionTimeLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { hours = 24 } = req.body;

    // Validate hours
    if (hours <= 0 || hours > 72) {
      return res.status(400).json({
        status: 'error',
        message: 'Extension hours must be between 1 and 72'
      });
    }

    // Find decision
    const decision = await Decision.findById(id);
    if (!decision) {
      return res.status(404).json({
        status: 'error',
        message: 'Decision not found'
      });
    }

    // Check if decision belongs to user
    if (decision.user.toString() !== req.user._id.toString() && !req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to extend this decision'
      });
    }

    // Check if decision is active
    if (decision.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot extend a ${decision.status} decision`
      });
    }

    // Update expiration
    const extensionSeconds = hours * 3600;
    decision.timeLimit += extensionSeconds;
    decision.expiresAt = decision.expiresAt 
      ? new Date(decision.expiresAt.getTime() + (extensionSeconds * 1000))
      : new Date(Date.now() + (extensionSeconds * 1000));
      
    await decision.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: decision.character,
      type: 'decision_extended',
      title: 'Decision Extended',
      description: `User extended decision time limit by ${hours} hours`,
      importance: 'low',
      relatedEntities: {
        narrative: decision.narrative,
        character: decision.character,
        decision: decision._id
      }
    });

    res.json({
      status: 'success',
      message: 'Decision time limit extended successfully',
      data: {
        newExpiresAt: decision.expiresAt,
        newTimeLimit: decision.timeLimit
      }
    });
  } catch (err) {
    console.error(`Error extending decision with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to extend decision time limit',
      error: err.message
    });
  }
};

/**
 * Get decision analytics
 * @route GET /api/decisions/analytics
 */
exports.getDecisionAnalytics = async (req, res) => {
  try {
    const { timeframe = 'week' } = req.query;
    
    // Determine date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }
    
    // Get decision counts by status
    const statusCounts = await Decision.aggregate([
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
    
    // Get decision counts by importance
    const importanceCounts = await Decision.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$importance',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get most active narratives
    const activeNarratives = await Decision.aggregate([
      {
        $match: {
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
          as: 'narrativeData'
        }
      },
      {
        $unwind: '$narrativeData'
      },
      {
        $project: {
          _id: 1,
          count: 1,
          title: '$narrativeData.title'
        }
      }
    ]);

    // Get average decision time
    const avgDecisionTime = await Decision.aggregate([
      {
        $match: {
          status: 'resolved',
          createdAt: { $gte: startDate },
          resolvedAt: { $exists: true }
        }
      },
      {
        $project: {
          timeTaken: { $subtract: ['$resolvedAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$timeTaken' }
        }
      }
    ]);
    
    res.json({
      status: 'success',
      data: {
        timeframe,
        startDate,
        endDate: now,
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        importanceCounts: importanceCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        activeNarratives,
        avgDecisionTime: avgDecisionTime.length > 0 
          ? Math.round(avgDecisionTime[0].avgTime / 1000) // Convert to seconds
          : 0
      }
    });
  } catch (err) {
    console.error('Error fetching decision analytics:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch decision analytics',
      error: err.message
    });
  }
}; 