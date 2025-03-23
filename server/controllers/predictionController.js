/**
 * Generate a prediction
 * @route POST /api/predictions/generate
 */
exports.generatePrediction = async (req, res) => {
  try {
    const {
      narrativeId,
      characterId,
      decisionId,
      type = 'binary',
      category,
      difficulty = 'medium',
      daysToResolve = 7
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
    
    // Generate prediction using AI service
    const predictionData = await ai.predictionGenerator.generatePrediction({
      narrativeId,
      characterId,
      decisionId,
      type,
      category,
      difficulty,
      daysToResolve
    });

    // Create prediction in database
    const prediction = await Prediction.create({
      ...predictionData,
      user: req.user._id,
      status: 'active',
      createdAt: Date.now(),
      expiresAt: new Date(Date.now() + (daysToResolve * 24 * 60 * 60 * 1000))
    });

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: characterId,
      type: 'prediction_generated',
      title: 'Prediction Generated',
      description: `AI generated a prediction for character "${character.name}" in narrative "${narrative.title}"`,
      importance: 'medium',
      relatedEntities: {
        narrative: narrativeId,
        character: characterId,
        prediction: prediction._id,
        decision: decisionId
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Prediction generated successfully',
      data: prediction
    });
  } catch (err) {
    console.error('Error generating prediction:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate prediction',
      error: err.message
    });
  }
};

/**
 * Make a prediction vote
 * @route POST /api/predictions/:id/vote
 */
exports.makePredictionVote = async (req, res) => {
  try {
    const { id } = req.params;
    const { optionIndex, amount = 10 } = req.body;

    if (optionIndex === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Option index is required'
      });
    }

    // Validate amount
    if (amount < 1 || amount > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be between 1 and 100'
      });
    }

    // Find prediction
    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({
        status: 'error',
        message: 'Prediction not found'
      });
    }

    // Check if prediction is active
    if (prediction.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot vote on a ${prediction.status} prediction`
      });
    }

    // Check if prediction is expired
    if (prediction.expiresAt && prediction.expiresAt < Date.now()) {
      prediction.status = 'expired';
      await prediction.save();
      
      return res.status(400).json({
        status: 'error',
        message: 'Prediction has expired'
      });
    }

    // Check if option exists
    if (optionIndex < 0 || optionIndex >= prediction.options.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid option index'
      });
    }

    // Check if user has already voted
    const existingVoteIndex = prediction.votes.findIndex(
      vote => vote.user.toString() === req.user._id.toString()
    );

    if (existingVoteIndex !== -1) {
      // Update existing vote
      prediction.votes[existingVoteIndex].optionIndex = optionIndex;
      prediction.votes[existingVoteIndex].amount = amount;
    } else {
      // Add new vote
      prediction.votes.push({
        user: req.user._id,
        optionIndex,
        amount,
        createdAt: Date.now()
      });
    }

    // Update participant count
    prediction.participantCount = new Set(prediction.votes.map(v => v.user.toString())).size;

    await prediction.save();

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'prediction_vote',
      title: 'Prediction Vote',
      description: `User voted for "${prediction.options[optionIndex]}" on prediction: ${prediction.question}`,
      importance: 'low',
      relatedEntities: {
        narrative: prediction.narrative,
        character: prediction.character,
        prediction: prediction._id
      }
    });

    res.json({
      status: 'success',
      message: 'Vote recorded successfully',
      data: {
        optionIndex,
        option: prediction.options[optionIndex],
        amount
      }
    });
  } catch (err) {
    console.error(`Error voting on prediction with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record vote',
      error: err.message
    });
  }
};

/**
 * Resolve a prediction
 * @route POST /api/predictions/:id/resolve
 */
exports.resolvePrediction = async (req, res) => {
  try {
    const { id } = req.params;
    const { correctOptionIndex, explanation } = req.body;

    if (correctOptionIndex === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Correct option index is required'
      });
    }

    // Find prediction
    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({
        status: 'error',
        message: 'Prediction not found'
      });
    }

    // Check if prediction is already resolved
    if (prediction.status === 'resolved') {
      return res.status(400).json({
        status: 'error',
        message: 'Prediction is already resolved'
      });
    }

    // Check ownership or admin role
    const isOwner = prediction.user.toString() === req.user._id.toString();
    const isAdmin = req.hasRole && req.hasRole('admin');
    const isOracle = req.hasRole && req.hasRole('oracle');
    
    if (!isOwner && !isAdmin && !isOracle) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to resolve this prediction'
      });
    }

    // Check if option exists
    if (correctOptionIndex < 0 || correctOptionIndex >= prediction.options.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid option index'
      });
    }

    // Update prediction
    prediction.status = 'resolved';
    prediction.correctOption = correctOptionIndex;
    prediction.resolution = {
      resolvedAt: Date.now(),
      resolvedBy: req.user._id,
      explanation: explanation || `The correct answer was: ${prediction.options[correctOptionIndex]}`
    };
    
    await prediction.save();

    // Calculate rewards for correct voters
    const rewards = [];
    
    for (const vote of prediction.votes) {
      const user = await User.findById(vote.user);
      if (!user) continue;
      
      // Check if the vote was correct
      if (vote.optionIndex === correctOptionIndex) {
        // Calculate reward based on difficulty and amount
        const rewardMultiplier = {
          easy: 1.2,
          medium: 1.5,
          hard: 2,
          extreme: 3
        }[prediction.difficulty] || 1.5;
        
        const rewardAmount = Math.round(vote.amount * rewardMultiplier);
        
        // Add tokens to user
        user.tokens = (user.tokens || 0) + rewardAmount;
        await user.save();
        
        rewards.push({
          user: user._id,
          username: user.username,
          amount: rewardAmount
        });
        
        // Log activity for user
        await Activity.create({
          user: user._id,
          type: 'prediction_reward',
          title: 'Prediction Reward',
          description: `You earned ${rewardAmount} tokens for correctly predicting: ${prediction.question}`,
          importance: 'medium',
          relatedEntities: {
            prediction: prediction._id
          }
        });
      }
    }

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: prediction.character,
      type: 'prediction_resolved',
      title: 'Prediction Resolved',
      description: `Prediction "${prediction.question}" was resolved with answer: ${prediction.options[correctOptionIndex]}`,
      importance: 'medium',
      relatedEntities: {
        narrative: prediction.narrative,
        character: prediction.character,
        prediction: prediction._id
      }
    });

    res.json({
      status: 'success',
      message: 'Prediction resolved successfully',
      data: {
        prediction,
        rewards
      }
    });
  } catch (err) {
    console.error(`Error resolving prediction with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resolve prediction',
      error: err.message
    });
  }
};

/**
 * Auto-resolve a prediction using AI
 * @route POST /api/predictions/:id/auto-resolve
 */
exports.autoResolvePrediction = async (req, res) => {
  try {
    const { id } = req.params;

    // Find prediction
    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({
        status: 'error',
        message: 'Prediction not found'
      });
    }

    // Check if prediction is already resolved
    if (prediction.status === 'resolved') {
      return res.status(400).json({
        status: 'error',
        message: 'Prediction is already resolved'
      });
    }

    // Check permission (admin, oracle, or owner)
    const isOwner = prediction.user.toString() === req.user._id.toString();
    const isAdmin = req.hasRole && req.hasRole('admin');
    const isOracle = req.hasRole && req.hasRole('oracle');
    
    if (!isOwner && !isAdmin && !isOracle) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to auto-resolve this prediction'
      });
    }

    // Initialize AI services
    const ai = initializeAIServices();
    
    // Resolve prediction using AI
    const resolution = await ai.predictionGenerator.resolvePrediction(prediction._id);
    
    if (!resolution || resolution.correctOption === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'AI could not determine the resolution for this prediction'
      });
    }

    // Update prediction with AI resolution
    prediction.status = 'resolved';
    prediction.correctOption = resolution.correctOption;
    prediction.resolution = {
      resolvedAt: Date.now(),
      resolvedBy: req.user._id,
      explanation: resolution.explanation,
      autoResolved: true
    };
    
    await prediction.save();

    // Calculate rewards for correct voters (similar to manual resolution)
    const rewards = [];
    
    for (const vote of prediction.votes) {
      const user = await User.findById(vote.user);
      if (!user) continue;
      
      if (vote.optionIndex === resolution.correctOption) {
        const rewardMultiplier = {
          easy: 1.2,
          medium: 1.5,
          hard: 2,
          extreme: 3
        }[prediction.difficulty] || 1.5;
        
        const rewardAmount = Math.round(vote.amount * rewardMultiplier);
        
        user.tokens = (user.tokens || 0) + rewardAmount;
        await user.save();
        
        rewards.push({
          user: user._id,
          username: user.username,
          amount: rewardAmount
        });
        
        await Activity.create({
          user: user._id,
          type: 'prediction_reward',
          title: 'Prediction Reward',
          description: `You earned ${rewardAmount} tokens for correctly predicting: ${prediction.question}`,
          importance: 'medium',
          relatedEntities: {
            prediction: prediction._id
          }
        });
      }
    }

    // Log activity
    await Activity.create({
      user: req.user._id,
      type: 'prediction_auto_resolved',
      title: 'Prediction Auto-Resolved',
      description: `Prediction "${prediction.question}" was auto-resolved with answer: ${prediction.options[resolution.correctOption]}`,
      importance: 'medium',
      relatedEntities: {
        narrative: prediction.narrative,
        prediction: prediction._id
      }
    });

    res.json({
      status: 'success',
      message: 'Prediction auto-resolved successfully',
      data: {
        prediction,
        resolution,
        rewards
      }
    });
  } catch (err) {
    console.error(`Error auto-resolving prediction with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to auto-resolve prediction',
      error: err.message
    });
  }
};

/**
 * Cancel a prediction
 * @route POST /api/predictions/:id/cancel
 */
exports.cancelPrediction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Find prediction
    const prediction = await Prediction.findById(id);
    if (!prediction) {
      return res.status(404).json({
        status: 'error',
        message: 'Prediction not found'
      });
    }

    // Check if prediction is already resolved or cancelled
    if (prediction.status === 'resolved' || prediction.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot cancel a ${prediction.status} prediction`
      });
    }

    // Check ownership or admin role
    const isOwner = prediction.user.toString() === req.user._id.toString();
    const isAdmin = req.hasRole && req.hasRole('admin');
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to cancel this prediction'
      });
    }

    // Update prediction
    prediction.status = 'cancelled';
    prediction.resolution = {
      resolvedAt: Date.now(),
      resolvedBy: req.user._id,
      explanation: reason || 'Prediction was cancelled by the creator'
    };
    
    await prediction.save();

    // Refund tokens to voters
    const refunds = [];
    
    for (const vote of prediction.votes) {
      const user = await User.findById(vote.user);
      if (!user) continue;
      
      // Refund the full amount
      user.tokens = (user.tokens || 0) + vote.amount;
      await user.save();
      
      refunds.push({
        user: user._id,
        username: user.username,
        amount: vote.amount
      });
      
      // Log activity for user
      await Activity.create({
        user: user._id,
        type: 'prediction_refund',
        title: 'Prediction Refund',
        description: `You were refunded ${vote.amount} tokens for cancelled prediction: ${prediction.question}`,
        importance: 'low',
        relatedEntities: {
          prediction: prediction._id
        }
      });
    }

    // Log activity
    await Activity.create({
      user: req.user._id,
      character: prediction.character,
      type: 'prediction_cancelled',
      title: 'Prediction Cancelled',
      description: `Prediction "${prediction.question}" was cancelled`,
      importance: 'medium',
      relatedEntities: {
        narrative: prediction.narrative,
        character: prediction.character,
        prediction: prediction._id
      }
    });

    res.json({
      status: 'success',
      message: 'Prediction cancelled successfully',
      data: {
        prediction,
        refunds
      }
    });
  } catch (err) {
    console.error(`Error cancelling prediction with ID ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel prediction',
      error: err.message
    });
  }
};

/**
 * Get prediction statistics and analytics
 * @route GET /api/predictions/analytics
 */
exports.getPredictionAnalytics = async (req, res) => {
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
    
    // Get prediction counts by status
    const statusCounts = await Prediction.aggregate([
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
    
    // Get prediction counts by type
    const typeCounts = await Prediction.aggregate([
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
      }
    ]);
    
    // Get prediction counts by difficulty
    const difficultyCounts = await Prediction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get most popular predictions
    const popularPredictions = await Prediction.find({
      createdAt: { $gte: startDate }
    })
      .sort({ participantCount: -1 })
      .limit(5)
      .select('question options participantCount status')
      .lean();
    
    // Get prediction accuracy for resolved predictions
    // This calculates what percentage of voters got it right
    const predictionAccuracy = await Prediction.aggregate([
      {
        $match: {
          status: 'resolved',
          createdAt: { $gte: startDate },
          'resolution.resolvedAt': { $exists: true },
          correctOption: { $exists: true }
        }
      },
      {
        $project: {
          _id: 1,
          votes: 1,
          correctOption: 1,
          totalVotes: { $size: '$votes' },
          correctVotes: {
            $size: {
              $filter: {
                input: '$votes',
                as: 'vote',
                cond: { $eq: ['$$vote.optionIndex', '$correctOption'] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalVotes: { $sum: '$totalVotes' },
          correctVotes: { $sum: '$correctVotes' }
        }
      }
    ]);
    
    const accuracy = predictionAccuracy.length > 0 && predictionAccuracy[0].totalVotes > 0
      ? Math.round((predictionAccuracy[0].correctVotes / predictionAccuracy[0].totalVotes) * 100)
      : 0;
    
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
        typeCounts: typeCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        difficultyCounts: difficultyCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        popularPredictions,
        overallAccuracy: accuracy
      }
    });
  } catch (err) {
    console.error('Error fetching prediction analytics:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch prediction analytics',
      error: err.message
    });
  }
};

/**
 * Get leaderboard of top predictors
 * @route GET /api/predictions/leaderboard
 */
exports.getPredictionLeaderboard = async (req, res) => {
  try {
    const { timeframe = 'all', limit = 10 } = req.query;
    
    // Determine date range based on timeframe
    const now = new Date();
    let startDate;
    
    if (timeframe !== 'all') {
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
          startDate = null;
      }
    }
    
    // Build match criteria
    const matchCriteria = {
      status: 'resolved',
      correctOption: { $exists: true }
    };
    
    if (startDate) {
      matchCriteria['resolution.resolvedAt'] = { $gte: startDate };
    }
    
    // Aggregate to find top predictors
    const leaderboard = await Prediction.aggregate([
      {
        $match: matchCriteria
      },
      {
        $unwind: '$votes'
      },
      {
        $match: {
          $expr: { $eq: ['$votes.optionIndex', '$correctOption'] }
        }
      },
      {
        $group: {
          _id: '$votes.user',
          correctPredictions: { $sum: 1 },
          totalReward: { $sum: '$votes.amount' }
        }
      },
      {
        $sort: { correctPredictions: -1, totalReward: -1 }
      },
      {
        $limit: parseInt(limit)
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
          userId: '$_id',
          username: '$userData.username',
          correctPredictions: 1,
          totalReward: 1
        }
      }
    ]);
    
    res.json({
      status: 'success',
      data: {
        timeframe,
        leaderboard
      }
    });
  } catch (err) {
    console.error('Error fetching prediction leaderboard:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch prediction leaderboard',
      error: err.message
    });
  }
}; 