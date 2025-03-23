/**
 * Blockchain Routes
 */

const express = require('express');
const router = express.Router();
const blockchainController = require('../../controllers/blockchainController');
const auth = require('../../middleware/auth');

/**
 * @route GET /api/blockchain/status
 * @desc Get blockchain connection status
 * @access Public
 */
router.get('/status', blockchainController.getStatus);

/**
 * @route GET /api/blockchain/tokens/balance
 * @desc Get user token balance
 * @access Private
 */
router.get('/tokens/balance', auth, blockchainController.getTokenBalance);

/**
 * @route POST /api/blockchain/tokens/transfer
 * @desc Transfer tokens to another user
 * @access Private
 */
router.post('/tokens/transfer', auth, blockchainController.transferTokens);

/**
 * @route GET /api/blockchain/nfts/user
 * @desc Get user's NFTs
 * @access Private
 */
router.get('/nfts/user', auth, blockchainController.getUserNFTs);

/**
 * @route GET /api/blockchain/nfts/:tokenId
 * @desc Get NFT details
 * @access Public
 */
router.get('/nfts/:tokenId', blockchainController.getNFTDetails);

/**
 * @route POST /api/blockchain/nfts/mint
 * @desc Mint a new NFT
 * @access Private
 */
router.post('/nfts/mint', auth, blockchainController.mintNFT);

/**
 * @route GET /api/blockchain/predictions/user
 * @desc Get user's prediction market entries
 * @access Private
 */
router.get('/predictions/user', auth, blockchainController.getUserPredictionMarketEntries);

/**
 * @route POST /api/blockchain/predictions/create
 * @desc Create a new prediction market entry
 * @access Private
 */
router.post('/predictions/create', auth, blockchainController.createPredictionMarketEntry);

/**
 * @route POST /api/blockchain/predictions/:predictionId/resolve
 * @desc Resolve a prediction market entry
 * @access Private (Admin/Oracle)
 */
router.post('/predictions/:predictionId/resolve', auth, blockchainController.resolvePredictionMarketEntry);

/**
 * @route GET /api/blockchain/gas-price
 * @desc Get current gas price
 * @access Public
 */
router.get('/gas-price', blockchainController.getGasPrice);

/**
 * @route GET /api/blockchain/contracts
 * @desc Get contract addresses
 * @access Public
 */
router.get('/contracts', blockchainController.getContractAddresses);

module.exports = router; 