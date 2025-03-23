const mongoose = require('mongoose');

const NarrativeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Narrative title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    summary: {
      type: String,
      required: [true, 'Narrative summary is required'],
      maxlength: [500, 'Summary cannot exceed 500 characters'],
    },
    description: {
      type: String,
      required: [true, 'Narrative description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      enum: [
        'politics', 'economics', 'technology', 'environment', 'culture',
        'military', 'diplomacy', 'science', 'healthcare', 'education',
        'crime', 'disaster', 'entertainment', 'sports', 'other'
      ],
      required: [true, 'Narrative category is required'],
    },
    tags: [{
      type: String,
      trim: true,
    }],
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'archived'],
      default: 'draft',
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public',
    },
    newsReferences: [{
      title: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      source: {
        type: String,
        required: true,
      },
      publishedAt: {
        type: Date,
      },
      relevance: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.5,
      },
    }],
    timeline: {
      startDate: {
        type: Date,
        required: true,
        default: Date.now,
      },
      endDate: {
        type: Date,
      },
      realWorldStartDate: {
        type: Date,
      },
      realWorldEndDate: {
        type: Date,
      },
    },
    locations: [{
      name: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    }],
    characters: [{
      character: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
      },
      role: {
        type: String,
        enum: ['protagonist', 'antagonist', 'supporter', 'neutral', 'observer'],
        default: 'neutral',
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    scenes: [{
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'active', 'completed'],
        default: 'pending',
      },
      startTime: {
        type: Date,
      },
      endTime: {
        type: Date,
      },
      location: {
        type: String,
      },
      requiredCharacters: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
      }],
      decisions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Decision',
      }],
    }],
    outcomes: [{
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      triggerConditions: {
        type: String,
      },
      isRevealed: {
        type: Boolean,
        default: false,
      },
      achievedAt: {
        type: Date,
      },
    }],
    generatedBy: {
      aiModel: {
        type: String,
        default: 'narrative-mastermind',
      },
      version: {
        type: String,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    parentNarrative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Narrative',
    },
    childNarratives: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Narrative',
    }],
    mediaAssets: [{
      type: {
        type: String,
        enum: ['image', 'video', 'audio', 'document'],
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      caption: {
        type: String,
      },
      order: {
        type: Number,
        default: 0,
      },
    }],
    predictions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prediction',
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Define indexes for faster queries
NarrativeSchema.index({ status: 1, visibility: 1 });
NarrativeSchema.index({ 'timeline.startDate': 1, 'timeline.endDate': 1 });
NarrativeSchema.index({ category: 1, tags: 1 });
NarrativeSchema.index({ 'characters.character': 1 });

// Virtual for narrative progress percentage
NarrativeSchema.virtual('progress').get(function() {
  const completedScenes = this.scenes.filter(scene => scene.status === 'completed').length;
  const totalScenes = this.scenes.length || 1; // Avoid division by zero
  
  return Math.floor((completedScenes / totalScenes) * 100);
});

// Virtual for active participants count
NarrativeSchema.virtual('activeParticipantsCount').get(function() {
  return this.characters.filter(char => char.isActive).length;
});

// Virtual for total decisions count
NarrativeSchema.virtual('decisionsCount').get(function() {
  return this.scenes.reduce((count, scene) => count + (scene.decisions ? scene.decisions.length : 0), 0);
});

// Create the Narrative model
const Narrative = mongoose.model('Narrative', NarrativeSchema);

module.exports = Narrative; 