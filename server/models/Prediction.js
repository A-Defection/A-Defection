/**
 * Prediction Model
 * 
 * Represents predictions about narratives and real-world events
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const predictionSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Prediction title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters long'],
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  description: {
    type: String,
    required: [true, 'Prediction description is required'],
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['politics', 'economics', 'technology', 'environment', 'culture', 
           'science', 'health', 'education', 'social', 'international', 'other']
  },
  tags: [String],
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  character: {
    type: Schema.Types.ObjectId,
    ref: 'Character'
  },
  narrative: {
    type: Schema.Types.ObjectId,
    ref: 'Narrative'
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  }],
  correctOption: {
    type: Number // Index of the correct option
  },
  deadline: {
    type: Date,
    required: true
  },
  evidenceSources: [{
    title: {
      type: String,
      required: true
    },
    url: {
      type: String
    },
    description: {
      type: String
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'resolved', 'expired', 'cancelled'],
    default: 'active'
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  votes: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    character: {
      type: Schema.Types.ObjectId,
      ref: 'Character'
    },
    option: {
      type: Number // Index of the option in the options array
    },
    confidence: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    stakeAmount: {
      type: Number,
      default: 0
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {
    option: {
      type: Number // Index of the winning option
    },
    explanation: {
      type: String
    },
    evidenceUrl: {
      type: String
    },
    resolvedAt: {
      type: Date
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    totalVotes: {
      type: Number,
      default: 0
    },
    totalStaked: {
      type: Number,
      default: 0
    },
    commentCount: {
      type: Number,
      default: 0
    }
  },
  isAutoResolved: {
    type: Boolean,
    default: false
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  nftTokenId: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for faster queries
predictionSchema.index({ user: 1 });
predictionSchema.index({ character: 1 });
predictionSchema.index({ narrative: 1 });
predictionSchema.index({ status: 1 });
predictionSchema.index({ category: 1 });
predictionSchema.index({ deadline: 1 });
predictionSchema.index({ title: 'text', description: 'text' });

// Virtual for time remaining
predictionSchema.virtual('timeRemaining').get(function() {
  if (!this.deadline || this.status !== 'active') return 0;
  
  const now = new Date();
  const diff = this.deadline - now;
  return Math.max(0, Math.floor(diff / 1000)); // Return in seconds
});

// Virtual for vote distribution
predictionSchema.virtual('voteDistribution').get(function() {
  const distribution = Array(this.options.length).fill(0);
  
  this.votes.forEach(vote => {
    if (vote.option >= 0 && vote.option < distribution.length) {
      distribution[vote.option]++;
    }
  });
  
  // Calculate percentages
  const total = distribution.reduce((sum, count) => sum + count, 0);
  const percentages = total > 0 
    ? distribution.map(count => Math.round((count / total) * 100)) 
    : distribution.map(() => 0);
  
  return {
    counts: distribution,
    percentages
  };
});

// Pre-save hook to update status based on deadline
predictionSchema.pre('save', function(next) {
  // Update vote metrics
  if (this.isModified('votes')) {
    this.metrics.totalVotes = this.votes.length;
    this.metrics.totalStaked = this.votes.reduce((sum, vote) => sum + (vote.stakeAmount || 0), 0);
  }
  
  // Check if prediction has expired based on deadline
  if (this.status === 'active' && this.deadline < new Date()) {
    this.status = 'expired';
  }
  
  next();
});

const Prediction = mongoose.model('Prediction', predictionSchema);

module.exports = Prediction; 