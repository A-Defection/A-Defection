/**
 * Character Model
 * 
 * Represents characters that participate in narratives
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const characterSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Character name is required'],
    trim: true,
    minlength: [2, 'Character name must be at least 2 characters long'],
    maxlength: [50, 'Character name cannot exceed 50 characters']
  },
  type: {
    type: String,
    required: [true, 'Character type is required'],
    enum: ['protagonist', 'antagonist', 'supporting', 'observer'],
    default: 'supporting'
  },
  avatar: {
    type: String,
    default: ''
  },
  background: {
    type: String,
    required: [true, 'Character background is required'],
    minlength: [10, 'Background must be at least 10 characters long'],
    maxlength: [2000, 'Background cannot exceed 2000 characters']
  },
  abilities: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    usageLimit: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    usageCount: {
      type: Number,
      default: 0
    },
    cooldown: {
      type: Number,
      default: 0 // In hours
    },
    lastUsed: {
      type: Date
    }
  }],
  traits: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    }
  }],
  goals: [String],
  narratives: [{
    narrative: {
      type: Schema.Types.ObjectId,
      ref: 'Narrative'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    active: {
      type: Boolean,
      default: true
    },
    role: {
      type: String,
      enum: ['main', 'supporting', 'guest'],
      default: 'supporting'
    }
  }],
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isNPC: {
    type: Boolean,
    default: false
  },
  isAnonymized: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  nftTokenId: {
    type: String
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  metrics: {
    decisionsCount: {
      type: Number,
      default: 0
    },
    predictionsCount: {
      type: Number,
      default: 0
    },
    predictionsAccuracy: {
      type: Number,
      default: 0
    },
    narrativesJoined: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add index for faster queries
characterSchema.index({ name: 'text', background: 'text' });
characterSchema.index({ user: 1 });
characterSchema.index({ 'narratives.narrative': 1 });
characterSchema.index({ visibility: 1 });

// Virtual field for character's activity level
characterSchema.virtual('activityLevel').get(function() {
  const total = this.metrics.decisionsCount + this.metrics.predictionsCount;
  if (total < 5) return 'low';
  if (total < 20) return 'medium';
  return 'high';
});

// Method to check if character can use an ability
characterSchema.methods.canUseAbility = function(abilityName) {
  const ability = this.abilities.find(a => a.name === abilityName);
  
  if (!ability) return { canUse: false, reason: 'Ability not found' };
  
  // Check usage limit
  if (ability.usageLimit !== -1 && ability.usageCount >= ability.usageLimit) {
    return { canUse: false, reason: 'Usage limit reached' };
  }
  
  // Check cooldown
  if (ability.cooldown > 0 && ability.lastUsed) {
    const cooldownEnd = new Date(ability.lastUsed);
    cooldownEnd.setHours(cooldownEnd.getHours() + ability.cooldown);
    
    if (cooldownEnd > new Date()) {
      return { 
        canUse: false, 
        reason: 'Ability on cooldown',
        availableAt: cooldownEnd
      };
    }
  }
  
  return { canUse: true };
};

const Character = mongoose.model('Character', characterSchema);

module.exports = Character; 