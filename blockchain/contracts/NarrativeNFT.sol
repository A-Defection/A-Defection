// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title NarrativeNFT
 * @dev ERC721 token for representing narrative elements as NFTs
 */
contract NarrativeNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Pausable, AccessControl, ERC721Burnable {
    using Counters for Counters.Counter;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter private _tokenIdCounter;
    
    // NFT types
    enum NFTType { Character, Narrative, Prediction, Achievement }
    
    // NFT metadata
    struct NFTMetadata {
        NFTType nftType;
        string externalId;   // ID reference to external system (MongoDB ID)
        string name;
        uint256 createdAt;
        uint256 rarity;      // 1-4: Common, Rare, Epic, Legendary
    }
    
    // Mapping from token ID to NFT metadata
    mapping(uint256 => NFTMetadata) private _tokenMetadata;
    
    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed to, NFTType nftType, string externalId);

    /**
     * @dev Initialize contract with roles assigned to deployer
     */
    constructor() ERC721("Narrative Elements", "NRTV-NFT") {
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
     * @dev Mint a new NFT token
     * @param to Address to receive the NFT
     * @param uri Token URI for metadata
     * @param nftType Type of NFT (Character, Narrative, etc)
     * @param externalId External system ID reference
     * @param name Name of the NFT
     * @param rarity Rarity level (1-4)
     * @return uint256 New token ID
     */
    function safeMint(
        address to, 
        string memory uri, 
        uint8 nftType, 
        string memory externalId, 
        string memory name, 
        uint256 rarity
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        require(rarity >= 1 && rarity <= 4, "Rarity must be between 1 and 4");
        
        // Get next token ID
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Save metadata
        _tokenMetadata[tokenId] = NFTMetadata({
            nftType: NFTType(nftType),
            externalId: externalId,
            name: name,
            createdAt: block.timestamp,
            rarity: rarity
        });
        
        // Mint token
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        emit NFTMinted(tokenId, to, NFTType(nftType), externalId);
        
        return tokenId;
    }
    
    /**
     * @dev Get NFT metadata for a token ID
     * @param tokenId Token ID to query
     * @return NFTMetadata Token metadata
     */
    function getTokenMetadata(uint256 tokenId) public view returns (NFTMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenMetadata[tokenId];
    }
    
    /**
     * @dev Get tokens owned by an address by type
     * @param owner Address to query
     * @param nftType Type of NFTs to return
     * @return uint256[] Array of token IDs
     */
    function getTokensByTypeAndOwner(address owner, uint8 nftType) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory result = new uint256[](balance);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(owner, i);
            if (_tokenMetadata[tokenId].nftType == NFTType(nftType)) {
                result[resultIndex] = tokenId;
                resultIndex++;
            }
        }
        
        // Resize array to actual result count
        assembly {
            mstore(result, resultIndex)
        }
        
        return result;
    }

    // Required overrides
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete _tokenMetadata[tokenId];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 