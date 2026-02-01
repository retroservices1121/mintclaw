// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract AgentNFT is ERC721, ERC721Enumerable, ERC2981, Ownable, ReentrancyGuard {
    using Strings for uint256;
    using SafeERC20 for IERC20;

    uint256 public maxSupply;
    uint256 public mintPrice; // in USDC (6 decimals)
    string public baseURI;

    IERC20 public immutable usdc;
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
        uint96 royaltyBps_,
        address usdcAddress_
    ) ERC721(name_, symbol_) Ownable(creator_) {
        baseURI = baseURI_;
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        platformFeeRecipient = platformFeeRecipient_;
        usdc = IERC20(usdcAddress_);

        // Set default royalty for ERC-2981
        _setDefaultRoyalty(creator_, royaltyBps_);
    }

    function mint(uint256 quantity) external nonReentrant {
        require(mintingEnabled, "Minting disabled");
        require(quantity > 0, "Quantity must be > 0");
        require(maxSupply == 0 || _tokenIdCounter + quantity <= maxSupply, "Exceeds max supply");

        uint256 totalCost = mintPrice * quantity;

        // Transfer USDC from minter if there's a cost
        if (totalCost > 0) {
            // Transfer full amount from minter to this contract first
            usdc.safeTransferFrom(msg.sender, address(this), totalCost);

            // Split payment: 2.5% to platform, rest to creator
            uint256 platformFee = (totalCost * PLATFORM_FEE_BPS) / 10000;
            uint256 creatorAmount = totalCost - platformFee;

            // Transfer to platform and creator
            usdc.safeTransfer(platformFeeRecipient, platformFee);
            usdc.safeTransfer(owner(), creatorAmount);
        }

        // Mint NFTs
        for (uint256 i = 0; i < quantity; i++) {
            _tokenIdCounter++;
            _safeMint(msg.sender, _tokenIdCounter);
            emit Minted(msg.sender, _tokenIdCounter);
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

    // Emergency withdraw in case tokens get stuck
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        IERC20(token).safeTransfer(owner(), balance);
        emit FundsWithdrawn(owner(), balance);
    }
}
