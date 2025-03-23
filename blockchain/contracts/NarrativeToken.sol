// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title NarrativeToken
 * @dev ERC20 token for the Narrative platform with role-based permissions
 */
contract NarrativeToken is ERC20, ERC20Burnable, Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    
    // Events
    event RewardDistributed(address indexed to, uint256 amount, string reason);

    /**
     * @dev Initialize contract with roles assigned to deployer
     */
    constructor() ERC20("Narrative Token", "NRTV") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Pause token transfers
     * @notice Can only be called by accounts with PAUSER_ROLE
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     * @notice Can only be called by accounts with PAUSER_ROLE
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Mint new tokens
     * @param to Address to receive new tokens
     * @param amount Amount of tokens to mint
     * @notice Can only be called by accounts with MINTER_ROLE
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum token supply");
        _mint(to, amount);
    }
    
    /**
     * @dev Distribute rewards to users
     * @param to Address to receive rewards
     * @param amount Amount of tokens to reward
     * @param reason Reason for the reward
     * @notice Can only be called by accounts with MINTER_ROLE
     */
    function distributeReward(address to, uint256 amount, string memory reason) 
        public 
        onlyRole(MINTER_ROLE) 
    {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum token supply");
        _mint(to, amount);
        emit RewardDistributed(to, amount, reason);
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
} 