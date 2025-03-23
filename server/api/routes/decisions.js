/**
 * Decision Routes
 */

const express = require('express');
const router = express.Router();
const decisionController = require('../../controllers/decisionController');
const { auth } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/checkRole');
const { validateDecisionCreate, validateDecisionMake } = require('../../middleware/validators/decisionValidator');

/**
 * @route GET /api/decisions
 * @desc Get all decisions (with filtering)
 * @access Public
 */
router.get('/', decisionController.getAllDecisions);

/**
 * @route GET /api/decisions/user
 * @desc Get current user's decisions
 * @access Private
 */
router.get('/user/me', decisionController.getUserDecisions);

/**
 * @route GET /api/decisions/pending
 * @desc Get pending decisions
 * @access Public
 */
router.get('/pending', decisionController.getPendingDecisions);

/**
 * @route GET /api/decisions/trending
 * @desc Get trending decisions
 * @access Public
 */
router.get('/trending', decisionController.getTrendingDecisions);

/**
 * @route GET /api/decisions/search
 * @desc Search decisions
 * @access Public
 */
router.get('/search', decisionController.searchDecisions);

/**
 * @route GET /api/decisions/:id
 * @desc Get decision by ID
 * @access Public
 */
router.get('/:id', decisionController.getDecisionById);

/**
 * @route POST /api/decisions
 * @desc Create a new decision
 * @access Private
 */
router.post('/', auth, validateDecisionCreate, decisionController.createDecision);

/**
 * @route POST /api/decisions/generate
 * @desc Generate a decision for a narrative and character
 * @access Private
 */
router.post('/generate', auth, decisionController.generateDecision);

/**
 * @route POST /api/decisions/:id/choose
 * @desc Choose a decision option
 * @access Private
 */
router.post('/:id/choose', auth, validateDecisionMake, decisionController.chooseDecisionOption);

/**
 * @route POST /api/decisions/:id/cancel
 * @desc Cancel a decision
 * @access Private
 */
router.post('/:id/cancel', auth, decisionController.cancelDecision);

/**
 * @route POST /api/decisions/:id/extend
 * @desc Extend decision deadline
 * @access Private
 */
router.post('/:id/extend', auth, decisionController.extendDecisionTimeLimit);

/**
 * @route GET /api/decisions/:id/eligibility
 * @desc Check character eligibility for decision options
 * @access Private
 */
router.get('/:id/eligibility/:characterId', auth, decisionController.checkEligibility);

/**
 * @route GET /api/decisions/:id/outcomes
 * @desc Get decision outcomes
 * @access Public
 */
router.get('/:id/outcomes', decisionController.getDecisionOutcomes);

/**
 * @route GET /api/decisions/:id/participants
 * @desc Get decision participants
 * @access Public
 */
router.get('/:id/participants', decisionController.getDecisionParticipants);

/**
 * @route GET /api/decisions/analytics
 * @desc Get decision analytics
 * @access Private
 */
router.get('/analytics', auth, checkRole('admin'), decisionController.getDecisionAnalytics);

module.exports = router; 