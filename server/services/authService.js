/**
 * Authentication Service
 * 
 * Handles authentication-related business logic
 */

const User = require('../models/User');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const ErrorResponse = require('../utils/errorResponse');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} - Registered user and token
 */
const registerUser = async (userData) => {
  // Check if user already exists
  const existingUser = await User.findOne({ 
    $or: [
      { email: userData.email },
      { username: userData.username }
    ]
  });

  if (existingUser) {
    if (existingUser.email === userData.email) {
      throw ErrorResponse.conflict('Email already in use');
    } else {
      throw ErrorResponse.conflict('Username already taken');
    }
  }

  // Create verification token
  const verificationToken = crypto.randomBytes(20).toString('hex');
  const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  // Create user
  const user = await User.create({
    ...userData,
    verificationToken,
    verificationTokenExpire
  });

  // Remove password from response
  user.password = undefined;

  // Generate verification URL
  const verificationUrl = `${config.cors.origin}/verify-email/${verificationToken}`;

  // Send welcome email
  try {
    await sendWelcomeEmail(user, verificationUrl);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Continue registration process even if email fails
  }

  // Create token
  const token = generateToken(user._id);

  return { user, token };
};

/**
 * Login user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} - Logged in user and token
 */
const loginUser = async (email, password) => {
  // Check if user exists
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw ErrorResponse.unauthorized('Invalid credentials');
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    throw ErrorResponse.unauthorized('Invalid credentials');
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Remove password from response
  user.password = undefined;

  // Create token
  const token = generateToken(user._id);

  return { user, token };
};

/**
 * Generate JWT token
 * @param {String} userId - User ID
 * @returns {String} - JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpire }
  );
};

/**
 * Generate refresh token
 * @param {String} userId - User ID
 * @returns {String} - JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpire }
  );
};

/**
 * Verify email
 * @param {String} token - Verification token
 * @returns {Object} - Verified user
 */
const verifyEmail = async (token) => {
  // Find user with the token and check if token is still valid
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpire: { $gt: Date.now() }
  });

  if (!user) {
    throw ErrorResponse.badRequest('Invalid or expired token');
  }

  // Update user verification status
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpire = undefined;
  await user.save({ validateBeforeSave: false });

  return user;
};

/**
 * Forgot password
 * @param {String} email - User email
 * @returns {Boolean} - Success status
 */
const forgotPassword = async (email) => {
  // Find user by email
  const user = await User.findOne({ email });

  if (!user) {
    throw ErrorResponse.notFound('User not found');
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set reset password fields
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  await user.save({ validateBeforeSave: false });

  // Generate reset URL
  const resetUrl = `${config.cors.origin}/reset-password/${resetToken}`;

  // Send password reset email
  try {
    await sendPasswordResetEmail(user, resetUrl);
    return true;
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    
    throw ErrorResponse.serverError('Email could not be sent');
  }
};

/**
 * Reset password
 * @param {String} token - Reset token
 * @param {String} password - New password
 * @returns {Object} - Updated user
 */
const resetPassword = async (token, password) => {
  // Hash token to compare with hashed token in database
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with the token and check if token is still valid
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    throw ErrorResponse.badRequest('Invalid or expired token');
  }

  // Update user password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return user;
};

module.exports = {
  registerUser,
  loginUser,
  generateToken,
  generateRefreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword
}; 