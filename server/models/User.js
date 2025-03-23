/**
 * User Model
 * 
 * Represents user accounts in the system
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password by default in queries
    },
    avatar: {
      type: String,
      default: '', // Default avatar URL or empty string
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: [String],
      select: false,
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    authProvider: {
      type: String,
      enum: ['local', 'google', 'twitter', 'facebook'],
      default: 'local',
    },
    authProviderId: String,
    notificationPreferences: {
      email: {
        narrativeUpdates: { type: Boolean, default: true },
        decisionReminders: { type: Boolean, default: true },
        predictionsResolved: { type: Boolean, default: true },
        characterJoined: { type: Boolean, default: true },
        weeklyDigest: { type: Boolean, default: true },
      },
      push: {
        narrativeUpdates: { type: Boolean, default: true },
        decisionReminders: { type: Boolean, default: true },
        predictionsResolved: { type: Boolean, default: true },
        characterJoined: { type: Boolean, default: true },
      },
      inApp: {
        narrativeUpdates: { type: Boolean, default: true },
        decisionReminders: { type: Boolean, default: true },
        predictionsResolved: { type: Boolean, default: true },
        characterJoined: { type: Boolean, default: true },
        activityFeed: { type: Boolean, default: true },
      },
    },
    metrics: {
      characterCount: { type: Number, default: 0 },
      decisionsCount: { type: Number, default: 0 },
      predictionsCount: { type: Number, default: 0 },
      predictionsCorrect: { type: Number, default: 0 },
      narrativesCreated: { type: Number, default: 0 },
      lastActive: { type: Date, default: Date.now },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    walletAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Please provide a valid Ethereum address'],
    },
    dftBalance: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
    },
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      language: {
        type: String,
        default: 'en',
      },
    },
    activities: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
    }],
    characters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
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

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '24h',
    }
  );
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Virtual for user's full name
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Create the User model
const User = mongoose.model('User', UserSchema);

module.exports = User; 