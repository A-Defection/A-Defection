/**
 * Character Routes
 */

const express = require('express');
const router = express.Router();
const characterController = require('../../controllers/characterController');
const { auth } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/checkRole');
const { validateCharacterCreate, validateCharacterUpdate } = require('../../middleware/validators/characterValidator');

/**
 * @route GET /api/characters
 * @desc Get all characters (with filtering)
 * @access Public
 */
router.get('/', characterController.getAllCharacters);

/**
 * @route GET /api/characters/user
 * @desc Get current user's characters
 * @access Private
 */
router.get('/user/me', characterController.getUserCharacters);

/**
 * @route GET /api/characters/types
 * @desc Get available character types
 * @access Public
 */
router.get('/types', characterController.getCharacterTypes);

/**
 * @route GET /api/characters/search
 * @desc Search characters
 * @access Public
 */
router.get('/search', characterController.searchCharacters);

/**
 * @route GET /api/characters/:id
 * @desc Get character by ID
 * @access Public
 */
router.get('/:id', characterController.getCharacterById);

/**
 * @route POST /api/characters
 * @desc Create a new character
 * @access Private
 */
router.post('/', auth, validateCharacterCreate, characterController.createCharacter);

/**
 * @route POST /api/characters/generate
 * @desc Generate a character for a narrative
 * @access Private
 */
router.post('/generate', auth, characterController.generateCharacter);

/**
 * @route PUT /api/characters/:id
 * @desc Update a character
 * @access Private (Owner)
 */
router.put('/:id', auth, validateCharacterUpdate, characterController.updateCharacter);

/**
 * @route DELETE /api/characters/:id
 * @desc Delete a character
 * @access Private (Owner)
 */
router.delete('/:id', auth, characterController.deleteCharacter);

/**
 * @route GET /api/characters/:id/decisions
 * @desc Get character decisions
 * @access Public
 */
router.get('/:id/decisions', characterController.getCharacterDecisions);

/**
 * @route GET /api/characters/:id/predictions
 * @desc Get character predictions
 * @access Public
 */
router.get('/:id/predictions', characterController.getCharacterPredictions);

/**
 * @route GET /api/characters/:id/activities
 * @desc Get character activity history
 * @access Public
 */
router.get('/:id/activities', characterController.getCharacterActivities);

/**
 * @route GET /api/characters/:id/narratives
 * @desc Get narratives character is participating in
 * @access Public
 */
router.get('/:id/narratives', characterController.getCharacterNarratives);

/**
 * @route POST /api/characters/:id/abilities/:abilityId/use
 * @desc Use a character ability
 * @access Private (Owner)
 */
router.post('/:id/abilities/:abilityId/use', auth, characterController.useAbility);

/**
 * @route GET /api/characters/:id/recommendations
 * @desc Get narrative recommendations for a character
 * @access Private (Owner)
 */
router.get('/:id/recommendations', auth, characterController.getNarrativeRecommendations);

/**
 * @route POST /api/characters/:id/mint-nft
 * @desc Mint character as NFT
 * @access Private (Owner)
 */
router.post('/:id/mint-nft', auth, characterController.mintCharacterNFT);

module.exports = router; 