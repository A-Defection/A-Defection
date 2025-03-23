/**
 * Activity Controller
 * 
 * Handles activity logging, retrieval, and related operations.
 */

const Activity = require('../models/Activity');
const User = require('../models/User');
const Character = require('../models/Character');
const Narrative = require('../models/Narrative');

/**
 * Get all activities with filtering
 * @route GET /api/activities
 */
exports.getAllActivities = async (req, res) => {
  try {
    const {
      type,
      importance,
      userId,
      characterId,
      narrativeId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (type) filter.type = type;
    if (importance) filter.importance = importance;
    if (userId) filter.user = userId;
    if (characterId) filter.character = characterId;
    if (narrativeId) filter['relatedEntities.narrative'] = narrativeId;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get activities
    const activities = await Activity.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username avatar')
      .populate('character', 'name type avatar')
      .lean();

    // Get total count for pagination
    const total = await Activity.countDocuments(filter);

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
    console.error('Error fetching activities:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activities',
      error: err.message
    });
  }
};

/**
 * Get global activity feed
 * @route GET /api/activities/feed
 */
exports.getActivityFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get recent public activities
    const activities = await Activity.find({
      // Filter out low importance and private activities
      importance: { $ne: 'low' },
      isPrivate: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username avatar')
      .populate('character', 'name type avatar')
      .lean();

    // Get total count for pagination
    const total = await Activity.countDocuments({
      importance: { $ne: 'low' },
      isPrivate: { $ne: true }
    });

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
    console.error('Error fetching activity feed:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activity feed',
      error: err.message
    });
  }
};

/**
 * Get narrative activity feed
 * @route GET /api/activities/narrative/:id
 */
exports.getNarrativeActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if narrative exists
    const narrative = await Narrative.findById(id).select('title');
    if (!narrative) {
      return res.status(404).json({
        status: 'error',
        message: 'Narrative not found'
      });
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get activities related to this narrative
    const activities = await Activity.find({
      $or: [
        { 'relatedEntities.narrative': id },
        { type: { $in: ['narrative_created', 'narrative_updated'] }, 'metadata.narrativeId': id }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username avatar')
      .populate('character', 'name type avatar')
      .lean();

    // Get total count for pagination
    const total = await Activity.countDocuments({
      $or: [
        { 'relatedEntities.narrative': id },
        { type: { $in: ['narrative_created', 'narrative_updated'] }, 'metadata.narrativeId': id }
      ]
    });

    res.json({
      status: 'success',
      data: {
        narrative: {
          _id: narrative._id,
          title: narrative.title
        },
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
    console.error(`Error fetching activities for narrative ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch narrative activities',
      error: err.message
    });
  }
};

/**
 * Log a new activity
 * @route POST /api/activities
 * @access Private/Admin
 */
exports.createActivity = async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      characterId,
      importance = 'medium',
      isPrivate = false,
      relatedEntities = {},
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!type || !title || !description) {
      return res.status(400).json({
        status: 'error',
        message: 'Type, title, and description are required'
      });
    }

    // Check admin role
    if (!req.hasRole('admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'Only administrators can create activities directly'
      });
    }

    // Create activity
    const activity = await Activity.create({
      type,
      title,
      description,
      user: req.user._id,
      character: characterId,
      importance,
      isPrivate,
      relatedEntities,
      metadata,
      createdAt: Date.now()
    });

    res.status(201).json({
      status: 'success',
      message: 'Activity logged successfully',
      data: activity
    });
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to log activity',
      error: err.message
    });
  }
};

/**
 * Get activity summary statistics
 * @route GET /api/activities/stats
 */
exports.getActivityStats = async (req, res) => {
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
    
    // Get activity counts by type
    const typeCounts = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Get activity counts by importance
    const importanceCounts = await Activity.aggregate([
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
    
    // Get most active users
    const activeUsers = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          user: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$user',
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
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $unwind: '$userData'
      },
      {
        $project: {
          _id: 1,
          count: 1,
          username: '$userData.username'
        }
      }
    ]);
    
    // Get most active characters
    const activeCharacters = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          character: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$character',
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
          from: 'characters',
          localField: '_id',
          foreignField: '_id',
          as: 'characterData'
        }
      },
      {
        $unwind: '$characterData'
      },
      {
        $project: {
          _id: 1,
          count: 1,
          name: '$characterData.name',
          type: '$characterData.type'
        }
      }
    ]);
    
    // Get daily activity counts
    const dailyActivity = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json({
      status: 'success',
      data: {
        timeframe,
        startDate,
        endDate: now,
        totalActivities: await Activity.countDocuments({ createdAt: { $gte: startDate } }),
        typeBreakdown: typeCounts,
        importanceBreakdown: importanceCounts,
        mostActiveUsers: activeUsers,
        mostActiveCharacters: activeCharacters,
        dailyActivity
      }
    });
  } catch (err) {
    console.error('Error fetching activity statistics:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activity statistics',
      error: err.message
    });
  }
}; 