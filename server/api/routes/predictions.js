/**
 * Prediction Routes
 */

const express = require('express');
const router = express.Router();
const predictionController = require('../../controllers/predictionController');
const { auth } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/checkRole');
const { validatePredictionCreate, validatePredictionRespond } = require('../../middleware/validators/predictionValidator');

/**
 * @route GET /api/predictions
 * @desc Get all predictions (with filtering)
 * @access Public
 */
router.get('/', predictionController.getAllPredictions);

/**
 * @route GET /api/predictions/user
 * @desc Get current user's predictions
 * @access Private
 */
router.get('/user/me', predictionController.getUserPredictions);

/**
 * @route GET /api/predictions/active
 * @desc Get active predictions
 * @access Public
 */
router.get('/active', predictionController.getActivePredictions);

/**
 * @route GET /api/predictions/trending
 * @desc Get trending predictions
 * @access Public
 */
router.get('/trending', predictionController.getTrendingPredictions);

/**
 * @route GET /api/predictions/leaderboard
 * @desc Get prediction leaderboard
 * @access Public
 */
router.get('/leaderboard', predictionController.getPredictionLeaderboard);

/**
 * @route GET /api/predictions/categories/:category
 * @desc Get predictions by category
 * @access Public
 */
router.get('/categories/:category', predictionController.getPredictionsByCategory);

/**
 * @route GET /api/predictions/search
 * @desc Search predictions
 * @access Public
 */
router.get('/search', predictionController.searchPredictions);

/**
 * @route GET /api/predictions/:id
 * @desc Get prediction by ID
 * @access Public
 */
router.get('/:id', predictionController.getPredictionById);

/**
 * @route POST /api/predictions
 * @desc Create a new prediction
 * @access Private
 */
router.post('/', auth, validatePredictionCreate, predictionController.createPrediction);

/**
 * @route POST /api/predictions/generate
 * @desc Generate a prediction for a narrative and character
 * @access Private
 */
router.post('/generate', auth, predictionController.generatePrediction);

/**
 * @route POST /api/predictions/:id/respond
 * @desc Respond to a prediction
 * @access Private (Character Owner)
 */
router.post('/:id/respond', auth, validatePredictionRespond, predictionController.respondToPrediction);

/**
 * @route POST /api/predictions/:id/stake
 * @desc Stake tokens on a prediction
 * @access Private
 */
router.post('/:id/stake', auth, predictionController.stakePrediction);

/**
 * @route GET /api/predictions/:id/votes
 * @desc Get community votes on a prediction
 * @access Public
 */
router.get('/:id/votes', predictionController.getPredictionVotes);

/**
 * @route POST /api/predictions/:id/vote
 * @desc Vote on a prediction
 * @access Private
 */
router.post('/:id/vote', auth, predictionController.voteOnPrediction);

/**
 * @route POST /api/predictions/:id/cancel
 * @desc Cancel a prediction
 * @access Private
 */
router.post('/:id/cancel', auth, predictionController.cancelPrediction);

/**
 * @route POST /api/predictions/:id/resolve
 * @desc Resolve a prediction
 * @access Private (Admin/Oracle)
 */
router.post('/:id/resolve', auth, predictionController.resolvePrediction);

/**
 * @route POST /api/predictions/:id/auto-resolve
 * @desc Auto-resolve a prediction
 * @access Private (Admin/Oracle)
 */
router.post('/:id/auto-resolve', auth, predictionController.autoResolvePrediction);

/**
 * @route POST /api/predictions/:id/mint-nft
 * @desc Mint prediction as NFT
 * @access Private (Owner)
 */
router.post('/:id/mint-nft', auth, predictionController.mintPredictionNFT);

/**
 * @route GET /api/predictions/analytics
 * @desc Get prediction analytics
 * @access Private
 */
router.get('/analytics', auth, checkRole('admin', 'analyst'), predictionController.getPredictionAnalytics);

module.exports = router; 