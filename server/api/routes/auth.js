/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { auth } = require('../../middleware/auth');
const { rateLimiter } = require('../../middleware/rateLimiter');

// Apply rate limiting to auth routes to prevent brute force attacks
const authRateLimiter = rateLimiter(10, 60); // 10 requests per minute

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', authRateLimiter, authController.register);

/**
 * @route POST /api/auth/login
 * @desc Authenticate user & get token
 * @access Public
 */
router.post('/login', authRateLimiter, authController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh authentication token
 * @access Public (with refresh token)
 */
router.post('/refresh-token', authRateLimiter, authController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Logout and invalidate tokens
 * @access Private
 */
router.post('/logout', auth, authController.logout);

/**
 * @route POST /api/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);

/**
 * @route POST /api/auth/reset-password/:token
 * @desc Reset password with token
 * @access Public (with reset token)
 */
router.post('/reset-password/:token', authRateLimiter, authController.resetPassword);

/**
 * @route GET /api/auth/verify-email/:token
 * @desc Verify email address
 * @access Public (with verification token)
 */
router.get('/verify-email/:token', authController.verifyEmail);

/**
 * @route GET /api/auth/oauth/:provider
 * @desc Initiate OAuth authentication
 * @access Public
 */
router.get('/google', authController.googleAuth);

/**
 * @route GET /api/auth/oauth/:provider/callback
 * @desc OAuth callback
 * @access Public
 */
router.get('/google/callback', authController.googleCallback);

/**
 * @route GET /api/auth/oauth/:provider
 * @desc Initiate OAuth authentication
 * @access Public
 */
router.get('/twitter', authController.twitterAuth);

/**
 * @route GET /api/auth/oauth/:provider/callback
 * @desc OAuth callback
 * @access Public
 */
router.get('/twitter/callback', authController.twitterCallback);

/**
 * @route GET /api/auth/me
 * @desc Get user information
 * @access Private
 */
router.get('/me', auth, authController.getMe);

module.exports = router; 