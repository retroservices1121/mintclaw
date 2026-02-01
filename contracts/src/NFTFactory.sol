// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentNFT.sol";

contract NFTFactory {
    address public platformFeeRecipient;
    address public usdc;
    address public owner;

    mapping(address => bool) public isDeployedCollection;
    address[] public deployedCollections;

    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 mintPrice
    );

    event PlatformFeeRecipientUpdated(address indexed newRecipient);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address platformFeeRecipient_, address usdcAddress_) {
        owner = msg.sender;
        platformFeeRecipient = platformFeeRecipient_;
        usdc = usdcAddress_;
    }

    function createCollection(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 maxSupply,
        uint256 mintPrice, // in USDC (6 decimals), e.g., 1000000 = $1
        uint96 royaltyBps
    ) external returns (address) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(bytes(baseURI).length > 0, "Base URI required");
        require(royaltyBps <= 1000, "Royalty too high"); // Max 10%

        AgentNFT collection = new AgentNFT(
            name,
            symbol,
            baseURI,
            maxSupply,
            mintPrice,
            msg.sender, // creator
            platformFeeRecipient,
            royaltyBps,
            usdc
        );

        address collectionAddress = address(collection);
        isDeployedCollection[collectionAddress] = true;
        deployedCollections.push(collectionAddress);

        emit CollectionCreated(
            collectionAddress,
            msg.sender,
            name,
            symbol,
            maxSupply,
            mintPrice
        );

        return collectionAddress;
    }

    function getDeployedCollections() external view returns (address[] memory) {
        return deployedCollections;
    }

    function getDeployedCollectionsCount() external view returns (uint256) {
        return deployedCollections.length;
    }

    function setPlatformFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        platformFeeRecipient = newRecipient;
        emit PlatformFeeRecipientUpdated(newRecipient);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }
}
