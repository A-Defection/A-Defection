/**
 * Decision Model
 * 
 * Represents character decisions in narratives
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const decisionSchema = new Schema({
  narrative: {
    type: Schema.Types.ObjectId,
    ref: 'Narrative',
    required: true
  },
  character: {
    type: Schema.Types.ObjectId,
    ref: 'Character',
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sceneId: {
    type: String
  },
  title: {
    type: String,
    required: [true, 'Decision title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  context: {
    type: String,
    required: [true, 'Decision context is required'],
    minlength: [10, 'Context must be at least 10 characters long'],
    maxlength: [2000, 'Context cannot exceed 2000 characters']
  },
  prompt: {
    type: String,
    required: [true, 'Decision prompt is required'],
    minlength: [5, 'Prompt must be at least 5 characters long'],
    maxlength: [500, 'Prompt cannot exceed 500 characters']
  },
  options: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    requirements: {
      traits: [{
        name: {
          type: String,
          required: true
        },
        minValue: {
          type: Number,
          default: 0
        }
      }],
      abilities: [String]
    },
    consequences: {
      type: String
    }
  }],
  chosenOption: {
    type: Schema.Types.ObjectId
  },
  outcomes: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    effects: {
      traits: [{
        name: {
          type: String,
          required: true
        },
        change: {
          type: Number,
          required: true
        }
      }],
      relationships: [{
        characterId: {
          type: Schema.Types.ObjectId,
          ref: 'Character'
        },
        change: {
          type: Number,
          required: true
        }
      }]
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'resolved', 'expired', 'cancelled'],
    default: 'active'
  },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  timeLimit: {
    type: Number, // Seconds
    default: 86400 // 24 hours
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
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
    option: {
      type: Schema.Types.ObjectId
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for faster queries
decisionSchema.index({ user: 1 });
decisionSchema.index({ character: 1 });
decisionSchema.index({ narrative: 1 });
decisionSchema.index({ status: 1 });
decisionSchema.index({ expiresAt: 1 }, { sparse: true });

// Virtual for time remaining
decisionSchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt || this.status !== 'active') return 0;
  
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.max(0, Math.floor(diff / 1000)); // Return in seconds
});

// Method to check if decision is expired
decisionSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Pre-save hook to set expiration date
decisionSchema.pre('save', function(next) {
  if (this.isNew && this.timeLimit && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + (this.timeLimit * 1000));
  }
  next();
});

const Decision = mongoose.model('Decision', decisionSchema);

module.exports = Decision; 