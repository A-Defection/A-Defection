/**
 * Authentication Controller
 * 
 * Handles user authentication, registration, and token management.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const config = require('../config/config');
const Activity = require('../models/Activity');
const sendEmail = require('../utils/sendEmail');

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - JWT token
 */
const generateToken = (user, expiresIn = config.jwt.expiresIn) => {
  return jwt.sign({ 
    userId: user._id,
    email: user.email,
    roles: user.roles 
  }, config.jwt.secret, { expiresIn });
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    config.jwt.secret + user.password.substring(user.password.length - 10),
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

/**
 * Register a new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists'
      });
    }
    
    // Create email verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    // Create user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      roles: ['user']
    });

    // Send verification email
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
    const message = `
      Please click the link below to verify your email address:
      
      ${verificationUrl}
      
      If you did not create this account, please ignore this email.
    `;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        message
      });
    } catch (err) {
      console.error('Email verification email failed to send:', err);
      // Continue with registration even if email fails
    }
    
    // Log activity
    await Activity.create({
      user: user._id,
      type: 'registration',
      title: 'User Registration',
      description: `User ${username} registered an account`,
      importance: 'medium'
    });
    
    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        token,
        refreshToken
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Could not register user',
      error: err.message
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account disabled. Please contact support.'
      });
    }
    
    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    // Save refresh token and update last login
    user.refreshToken = refreshToken;
    user.lastLogin = Date.now();
    await user.save();
    
    // Log activity
    await Activity.create({
      user: user._id,
      type: 'login',
      title: 'User Login',
      description: `User ${user.username} logged in`,
      importance: 'low'
    });
    
    // Set cookie if in production
    if (config.env === 'production') {
      res.cookie('refreshToken', refreshToken, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite
      });
    }
    
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        userId: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        token,
        refreshToken
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login',
      error: err.message
    });
  }
};

/**
 * Refresh token
 * @route POST /api/auth/refresh
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }
    
    // Find user with this refresh token
    const user = await User.findOne({ refreshToken });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }
    
    // Verify refresh token
    try {
      jwt.verify(
        refreshToken,
        config.jwt.secret + user.password.substring(user.password.length - 10)
      );
    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token'
      });
    }
    
    // Generate new tokens
    const token = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();
    
    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        token,
        refreshToken: newRefreshToken
      }
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error during token refresh',
      error: err.message
    });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const user = req.user;
    const token = req.token;
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated'
      });
    }
    
    // Add token to blacklist
    if (!user.tokenBlacklist) {
      user.tokenBlacklist = [];
    }
    
    user.tokenBlacklist.push(token);
    
    // Remove refresh token
    user.refreshToken = undefined;
    await user.save();
    
    // Log activity
    await Activity.create({
      user: user._id,
      type: 'logout',
      title: 'User Logout',
      description: `User ${user.username} logged out`,
      importance: 'low'
    });
    
    // Clear cookie if in production
    if (config.env === 'production') {
      res.clearCookie('refreshToken');
    }
    
    res.json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error during logout',
      error: err.message
    });
  }
};

/**
 * Verify email
 * @route GET /api/auth/verify-email/:token
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Find user with verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }
    
    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    // Log activity
    await Activity.create({
      user: user._id,
      type: 'email_verification',
      title: 'Email Verification',
      description: `User ${user.username} verified their email address`,
      importance: 'medium'
    });
    
    res.json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error during email verification',
      error: err.message
    });
  }
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set expiration
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await user.save();
    
    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    
    // Send email
    const message = `
      You are receiving this email because you (or someone else) has requested the reset of a password.
      Please click the link below to reset your password:
      
      ${resetUrl}
      
      If you did not request this, please ignore this email and your password will remain unchanged.
    `;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        message
      });
      
      res.json({
        status: 'success',
        message: 'Password reset email sent'
      });
    } catch (err) {
      console.error('Password reset email error:', err);
      
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      return res.status(500).json({
        status: 'error',
        message: 'Could not send reset email'
      });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error during password reset request',
      error: err.message
    });
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res) => {
  try {
    // Get token from params
    const { token } = req.params;
    const { password } = req.body;
    
    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user by token and check if token is still valid
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }
    
    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Invalidate existing sessions
    user.tokenBlacklist = user.tokenBlacklist || [];
    user.refreshToken = undefined;
    
    await user.save();
    
    // Log activity
    await Activity.create({
      user: user._id,
      type: 'password_reset',
      title: 'Password Reset',
      description: `User ${user.username} reset their password`,
      importance: 'high'
    });
    
    res.json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server error during password reset',
      error: err.message
    });
  }
};

/**
 * Initiate OAuth authentication
 * @route GET /api/auth/oauth/:provider
 */
exports.oauthInitiate = (req, res) => {
  const { provider } = req.params;
  
  // In a real implementation, redirect to OAuth provider
  // For now, just return information about the feature
  res.json({
    status: 'info',
    message: `OAuth with ${provider} is not implemented yet`,
    data: {
      provider,
      feature: 'coming soon'
    }
  });
};

/**
 * OAuth callback
 * @route GET /api/auth/oauth/:provider/callback
 */
exports.oauthCallback = (req, res) => {
  const { provider } = req.params;
  
  // In a real implementation, handle OAuth callback
  // For now, just return information about the feature
  res.json({
    status: 'info',
    message: `OAuth callback for ${provider} is not implemented yet`,
    data: {
      provider,
      feature: 'coming soon'
    }
  });
}; 