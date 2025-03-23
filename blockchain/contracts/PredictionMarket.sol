// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PredictionMarket
 * @dev Contract for managing prediction stakes and rewards
 */
contract PredictionMarket is Pausable, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    // Token used for staking and rewards
    IERC20 public token;
    
    // Prediction statuses
    enum PredictionStatus { Active, Resolved, Canceled }
    
    // Prediction types
    enum PredictionType { Binary, Multiple, Range, Time, Compound }
    
    // Prediction structure
    struct Prediction {
        string externalId;         // External ID (MongoDB reference)
        address creator;           // Creator address
        uint256 stakeAmount;       // Amount staked
        uint256 potentialReward;   // Potential reward amount
        uint256 createdAt;         // Creation timestamp
        uint256 deadline;          // Resolution deadline
        PredictionStatus status;   // Current status
        PredictionType predType;   // Prediction type
        bool creatorWon;           // Whether creator won prediction
    }
    
    // Mapping of prediction ID to prediction data
    mapping(bytes32 => Prediction) public predictions;
    
    // Mapping of user address to array of prediction IDs
    mapping(address => bytes32[]) public userPredictions;
    
    // Events
    event PredictionCreated(bytes32 indexed predictionId, address indexed creator, string externalId, uint256 stakeAmount);
    event PredictionResolved(bytes32 indexed predictionId, bool creatorWon, uint256 rewardAmount);
    event PredictionCanceled(bytes32 indexed predictionId, uint256 refundAmount);
    event RewardClaimed(bytes32 indexed predictionId, address indexed user, uint256 amount);

    /**
     * @dev Initialize contract with token address and roles
     * @param _token Address of the ERC20 token used for stakes and rewards
     */
    constructor(address _token) {
        require(_token != address(0), "Token address cannot be zero");
        token = IERC20(_token);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    /**
     * @dev Pause contract functionality
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract functionality
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Create a new prediction with stake
     * @param externalId External ID reference (MongoDB)
     * @param stakeAmount Amount to stake
     * @param deadline Deadline timestamp for resolution
     * @param predType Type of prediction
     * @param potentialReward Potential reward amount
     * @return predictionId Unique prediction ID
     */
    function createPrediction(
        string memory externalId,
        uint256 stakeAmount,
        uint256 deadline,
        uint8 predType,
        uint256 potentialReward
    ) public whenNotPaused nonReentrant returns (bytes32) {
        require(stakeAmount > 0, "Stake amount must be greater than zero");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(token.balanceOf(msg.sender) >= stakeAmount, "Insufficient token balance");
        
        // Generate unique prediction ID
        bytes32 predictionId = keccak256(abi.encodePacked(externalId, msg.sender, block.timestamp));
        
        // Ensure prediction ID doesn't already exist
        require(predictions[predictionId].createdAt == 0, "Prediction ID already exists");
        
        // Transfer tokens from user to contract
        token.safeTransferFrom(msg.sender, address(this), stakeAmount);
        
        // Create prediction
        predictions[predictionId] = Prediction({
            externalId: externalId,
            creator: msg.sender,
            stakeAmount: stakeAmount,
            potentialReward: potentialReward,
            createdAt: block.timestamp,
            deadline: deadline,
            status: PredictionStatus.Active,
            predType: PredictionType(predType),
            creatorWon: false
        });
        
        // Add to user's predictions
        userPredictions[msg.sender].push(predictionId);
        
        emit PredictionCreated(predictionId, msg.sender, externalId, stakeAmount);
        
        return predictionId;
    }
    
    /**
     * @dev Resolve a prediction and distribute rewards
     * @param predictionId ID of the prediction to resolve
     * @param creatorWon Whether the creator won the prediction
     * @param rewardAmount Actual reward amount
     */
    function resolvePrediction(
        bytes32 predictionId,
        bool creatorWon,
        uint256 rewardAmount
    ) public onlyRole(ORACLE_ROLE) nonReentrant {
        Prediction storage prediction = predictions[predictionId];
        
        require(prediction.createdAt > 0, "Prediction does not exist");
        require(prediction.status == PredictionStatus.Active, "Prediction already resolved or canceled");
        
        // Update prediction status
        prediction.status = PredictionStatus.Resolved;
        prediction.creatorWon = creatorWon;
        
        // Distribute rewards if creator won
        if (creatorWon) {
            uint256 reward = rewardAmount > 0 ? rewardAmount : prediction.potentialReward;
            token.safeTransfer(prediction.creator, prediction.stakeAmount + reward);
            
            emit RewardClaimed(predictionId, prediction.creator, prediction.stakeAmount + reward);
        }
        
        emit PredictionResolved(predictionId, creatorWon, rewardAmount);
    }
    
    /**
     * @dev Cancel a prediction and refund stake
     * @param predictionId ID of the prediction to cancel
     */
    function cancelPrediction(bytes32 predictionId) public onlyRole(ORACLE_ROLE) nonReentrant {
        Prediction storage prediction = predictions[predictionId];
        
        require(prediction.createdAt > 0, "Prediction does not exist");
        require(prediction.status == PredictionStatus.Active, "Prediction already resolved or canceled");
        
        // Update prediction status
        prediction.status = PredictionStatus.Canceled;
        
        // Refund stake
        token.safeTransfer(prediction.creator, prediction.stakeAmount);
        
        emit PredictionCanceled(predictionId, prediction.stakeAmount);
    }
    
    /**
     * @dev Get user predictions
     * @param user Address of the user
     * @return bytes32[] Array of prediction IDs
     */
    function getUserPredictions(address user) public view returns (bytes32[] memory) {
        return userPredictions[user];
    }
    
    /**
     * @dev Get prediction details
     * @param predictionId ID of the prediction
     * @return Prediction details
     */
    function getPrediction(bytes32 predictionId) public view returns (Prediction memory) {
        require(predictions[predictionId].createdAt > 0, "Prediction does not exist");
        return predictions[predictionId];
    }
    
    /**
     * @dev Get active predictions count for a user
     * @param user Address of the user
     * @return uint256 Count of active predictions
     */
    function getActiveUserPredictionsCount(address user) public view returns (uint256) {
        bytes32[] memory userPreds = userPredictions[user];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < userPreds.length; i++) {
            if (predictions[userPreds[i]].status == PredictionStatus.Active) {
                activeCount++;
            }
        }
        
        return activeCount;
    }
    
    /**
     * @dev Withdraw tokens in case of emergency
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdraw(uint256 amount, address recipient) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(recipient != address(0), "Cannot withdraw to zero address");
        token.safeTransfer(recipient, amount);
    }
} 