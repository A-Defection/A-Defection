/**
 * Notification Model
 * 
 * Represents user notifications for various events in the system
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: [
      'system',
      'character',
      'narrative',
      'decision',
      'prediction',
      'achievement',
      'user'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  read: {
    type: Boolean,
    default: false
  },
  relatedLinks: [{
    title: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  }],
  relatedEntities: {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    character: {
      type: Schema.Types.ObjectId,
      ref: 'Character'
    },
    narrative: {
      type: Schema.Types.ObjectId,
      ref: 'Narrative'
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
  expiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    // Set expiration if not provided
    if (!notificationData.expiresAt) {
      // Default expiration: 30 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      notificationData.expiresAt = expiresAt;
    }
    
    return await this.create(notificationData);
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Static method to mark all notifications as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, read: false },
    { read: true }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 