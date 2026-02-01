// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract AgentNFT is ERC721, ERC721Enumerable, ERC2981, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public maxSupply;
    uint256 public mintPrice;
    string public baseURI;

    address public platformFeeRecipient;
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%

    uint256 private _tokenIdCounter;
    bool public mintingEnabled = true;

    event Minted(address indexed to, uint256 indexed tokenId);
    event MintingToggled(bool enabled);
    event BaseURIUpdated(string newBaseURI);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        address creator_,
        address platformFeeRecipient_,
        uint96 royaltyBps_
    ) ERC721(name_, symbol_) Ownable(creator_) {
        baseURI = baseURI_;
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        platformFeeRecipient = platformFeeRecipient_;

        // Set default royalty for ERC-2981
        _setDefaultRoyalty(creator_, royaltyBps_);
    }

    function mint(uint256 quantity) external payable nonReentrant {
        require(mintingEnabled, "Minting disabled");
        require(quantity > 0, "Quantity must be > 0");
        require(maxSupply == 0 || _tokenIdCounter + quantity <= maxSupply, "Exceeds max supply");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");

        for (uint256 i = 0; i < quantity; i++) {
            _tokenIdCounter++;
            _safeMint(msg.sender, _tokenIdCounter);
            emit Minted(msg.sender, _tokenIdCounter);
        }

        // Split payment: 2.5% to platform, rest to creator
        if (msg.value > 0) {
            uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / 10000;
            uint256 creatorAmount = msg.value - platformFee;

            // Use call instead of transfer for safety
            (bool platformSuccess, ) = platformFeeRecipient.call{value: platformFee}("");
            require(platformSuccess, "Platform fee transfer failed");

            (bool creatorSuccess, ) = owner().call{value: creatorAmount}("");
            require(creatorSuccess, "Creator payment failed");
        }
    }

    function toggleMinting() external onlyOwner {
        mintingEnabled = !mintingEnabled;
        emit MintingToggled(mintingEnabled);
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    function totalMinted() public view returns (uint256) {
        return _tokenIdCounter;
    }

    // Required overrides for ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // Emergency withdraw in case ETH gets stuck
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");

        emit FundsWithdrawn(owner(), balance);
    }
}
