/**
 * Activity Model
 * 
 * Represents user activities and system events
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activitySchema = new Schema({
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: [
      // User actions
      'user_registered',
      'user_login',
      'profile_updated',
      
      // Character actions
      'character_created',
      'character_updated',
      'character_deleted',
      'character_joined_narrative',
      'character_left_narrative',
      'ability_used',
      
      // Narrative actions
      'narrative_created',
      'narrative_updated',
      'narrative_deleted',
      'narrative_completed',
      'scene_added',
      
      // Decision actions
      'decision_created',
      'decision_generated',
      'decision_resolved',
      'decision_expired',
      'decision_cancelled',
      
      // Prediction actions
      'prediction_created',
      'prediction_voted',
      'prediction_resolved',
      'prediction_cancelled',
      
      // System events
      'system_announcement',
      'system_maintenance',
      'ai_generated'
    ]
  },
  title: {
    type: String,
    required: [true, 'Activity title is required']
  },
  description: {
    type: String,
    required: [true, 'Activity description is required']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  character: {
    type: Schema.Types.ObjectId,
    ref: 'Character'
  },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  relatedEntities: {
    narrative: {
      type: Schema.Types.ObjectId,
      ref: 'Narrative'
    },
    character: {
      type: Schema.Types.ObjectId,
      ref: 'Character'
    },
    decision: {
      type: Schema.Types.ObjectId,
      ref: 'Decision'
    },
    prediction: {
      type: Schema.Types.ObjectId,
      ref: 'Prediction'
    }
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  anonymized: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
activitySchema.index({ type: 1 });
activitySchema.index({ user: 1 });
activitySchema.index({ character: 1 });
activitySchema.index({ 'relatedEntities.narrative': 1 });
activitySchema.index({ importance: 1 });
activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity; 