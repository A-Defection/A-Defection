/**
 * Narrative Routes
 */

const express = require('express');
const router = express.Router();
const narrativeController = require('../../controllers/narrativeController');
const { auth } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/checkRole');
const { validateNarrativeCreate, validateNarrativeUpdate } = require('../../middleware/validators/narrativeValidator');

/**
 * @route GET /api/narratives
 * @desc Get all narratives with filtering options
 * @access Public
 */
router.get('/', narrativeController.getAllNarratives);

/**
 * @route GET /api/narratives/featured
 * @desc Get featured narratives
 * @access Public
 */
router.get('/featured', narrativeController.getFeaturedNarratives);

/**
 * @route GET /api/narratives/categories/:category
 * @desc Get narratives by category
 * @access Public
 */
router.get('/category/:category', narrativeController.getNarrativesByCategory);

/**
 * @route GET /api/narratives/tags/:tag
 * @desc Get narratives by tag
 * @access Public
 */
router.get('/tag/:tag', narrativeController.getNarrativesByTag);

/**
 * @route GET /api/narratives/search
 * @desc Search narratives
 * @access Public
 */
router.get('/search', narrativeController.searchNarratives);

/**
 * @route GET /api/narratives/:id
 * @desc Get narrative by ID
 * @access Public
 */
router.get('/:id', narrativeController.getNarrativeById);

/**
 * @route POST /api/narratives
 * @desc Create a new narrative
 * @access Private
 */
router.post('/', auth, validateNarrativeCreate, narrativeController.createNarrative);

/**
 * @route POST /api/narratives/generate
 * @desc Generate a narrative from news
 * @access Private
 */
router.post('/generate', auth, narrativeController.generateNarrative);

/**
 * @route PUT /api/narratives/:id
 * @desc Update a narrative
 * @access Private
 */
router.put('/:id', auth, validateNarrativeUpdate, narrativeController.updateNarrative);

/**
 * @route DELETE /api/narratives/:id
 * @desc Delete a narrative
 * @access Private (Admin/Owner)
 */
router.delete('/:id', auth, narrativeController.deleteNarrative);

/**
 * @route POST /api/narratives/:id/join
 * @desc Join a narrative with a character
 * @access Private
 */
router.post('/:id/join', auth, narrativeController.joinNarrative);

/**
 * @route POST /api/narratives/:id/leave
 * @desc Leave a narrative with a character
 * @access Private
 */
router.post('/:id/leave', auth, narrativeController.leaveNarrative);

/**
 * @route GET /api/narratives/:id/characters
 * @desc Get characters in a narrative
 * @access Public
 */
router.get('/:id/characters', narrativeController.getNarrativeCharacters);

/**
 * @route GET /api/narratives/:id/scenes
 * @desc Get scenes in a narrative
 * @access Public
 */
router.get('/:id/scenes', narrativeController.getNarrativeScenes);

/**
 * @route GET /api/narratives/:id/decisions
 * @desc Get decisions in a narrative
 * @access Public
 */
router.get('/:id/decisions', narrativeController.getNarrativeDecisions);

/**
 * @route GET /api/narratives/:id/predictions
 * @desc Get predictions in a narrative
 * @access Public
 */
router.get('/:id/predictions', narrativeController.getNarrativePredictions);

/**
 * @route POST /api/narratives/:id/scenes
 * @desc Add a scene to a narrative
 * @access Private (Admin/Owner)
 */
router.post('/:id/scenes', auth, narrativeController.addScene);

/**
 * @route PUT /api/narratives/:id/scenes/:sceneId
 * @desc Update a scene in a narrative
 * @access Private (Admin/Owner)
 */
router.put('/:id/scenes/:sceneId', auth, narrativeController.updateScene);

module.exports = router; 