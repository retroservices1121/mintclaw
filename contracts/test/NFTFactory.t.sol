// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/NFTFactory.sol";
import "../src/AgentNFT.sol";

contract NFTFactoryTest is Test {
    NFTFactory public factory;
    address public platformFeeRecipient = address(0x1234);
    address public creator = address(0x5678);
    address public minter = address(0x9ABC);

    function setUp() public {
        factory = new NFTFactory(platformFeeRecipient);
        vm.deal(minter, 10 ether);
    }

    function test_CreateCollection() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://api.example.com/metadata/",
            1000,
            0.01 ether,
            500 // 5% royalty
        );

        assertTrue(factory.isDeployedCollection(collection));
        assertEq(factory.getDeployedCollectionsCount(), 1);

        AgentNFT nft = AgentNFT(collection);
        assertEq(nft.name(), "Test Collection");
        assertEq(nft.symbol(), "TEST");
        assertEq(nft.maxSupply(), 1000);
        assertEq(nft.mintPrice(), 0.01 ether);
        assertEq(nft.owner(), creator);
    }

    function test_Mint() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://api.example.com/metadata/",
            100,
            0.01 ether,
            500
        );

        AgentNFT nft = AgentNFT(collection);

        uint256 platformBalanceBefore = platformFeeRecipient.balance;
        uint256 creatorBalanceBefore = creator.balance;

        vm.prank(minter);
        nft.mint{value: 0.01 ether}(1);

        assertEq(nft.balanceOf(minter), 1);
        assertEq(nft.ownerOf(1), minter);
        assertEq(nft.totalMinted(), 1);

        // Check fee split: 2.5% to platform, 97.5% to creator
        uint256 platformFee = (0.01 ether * 250) / 10000;
        uint256 creatorAmount = 0.01 ether - platformFee;

        assertEq(platformFeeRecipient.balance - platformBalanceBefore, platformFee);
        assertEq(creator.balance - creatorBalanceBefore, creatorAmount);
    }

    function test_MintMultiple() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://api.example.com/metadata/",
            100,
            0.01 ether,
            500
        );

        AgentNFT nft = AgentNFT(collection);

        vm.prank(minter);
        nft.mint{value: 0.05 ether}(5);

        assertEq(nft.balanceOf(minter), 5);
        assertEq(nft.totalMinted(), 5);
    }

    function test_RevertMintExceedsSupply() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://api.example.com/metadata/",
            2,
            0.01 ether,
            500
        );

        AgentNFT nft = AgentNFT(collection);

        vm.prank(minter);
        nft.mint{value: 0.02 ether}(2);

        vm.expectRevert("Exceeds max supply");
        vm.prank(minter);
        nft.mint{value: 0.01 ether}(1);
    }

    function test_RevertInsufficientPayment() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://api.example.com/metadata/",
            100,
            0.01 ether,
            500
        );

        AgentNFT nft = AgentNFT(collection);

        vm.expectRevert("Insufficient payment");
        vm.prank(minter);
        nft.mint{value: 0.005 ether}(1);
    }

    function test_ToggleMinting() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://api.example.com/metadata/",
            100,
            0.01 ether,
            500
        );

        AgentNFT nft = AgentNFT(collection);

        vm.prank(creator);
        nft.toggleMinting();

        assertFalse(nft.mintingEnabled());

        vm.expectRevert("Minting disabled");
        vm.prank(minter);
        nft.mint{value: 0.01 ether}(1);
    }

    function test_TokenURI() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://api.example.com/metadata/",
            100,
            0.01 ether,
            500
        );

        AgentNFT nft = AgentNFT(collection);

        vm.prank(minter);
        nft.mint{value: 0.01 ether}(1);

        assertEq(nft.tokenURI(1), "https://api.example.com/metadata/1");
    }

    function test_Royalty() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://api.example.com/metadata/",
            100,
            0.01 ether,
            500 // 5%
        );

        AgentNFT nft = AgentNFT(collection);

        vm.prank(minter);
        nft.mint{value: 0.01 ether}(1);

        (address receiver, uint256 royaltyAmount) = nft.royaltyInfo(1, 1 ether);
        assertEq(receiver, creator);
        assertEq(royaltyAmount, 0.05 ether); // 5% of 1 ether
    }

    function test_UnlimitedSupply() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Unlimited Collection",
            "UNLIM",
            "https://api.example.com/metadata/",
            0, // 0 means unlimited
            0.01 ether,
            500
        );

        AgentNFT nft = AgentNFT(collection);

        // Should be able to mint many
        vm.prank(minter);
        nft.mint{value: 1 ether}(100);

        assertEq(nft.totalMinted(), 100);
    }

    function test_FreeMint() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Free Collection",
            "FREE",
            "https://api.example.com/metadata/",
            100,
            0, // Free mint
            500
        );

        AgentNFT nft = AgentNFT(collection);

        vm.prank(minter);
        nft.mint{value: 0}(5);

        assertEq(nft.balanceOf(minter), 5);
    }

    function test_SetBaseURI() public {
        vm.prank(creator);
        address collection = factory.createCollection(
            "Test Collection",
            "TEST",
            "https://old.example.com/",
            100,
            0.01 ether,
            500
        );

        AgentNFT nft = AgentNFT(collection);

        vm.prank(minter);
        nft.mint{value: 0.01 ether}(1);

        vm.prank(creator);
        nft.setBaseURI("https://new.example.com/");

        assertEq(nft.tokenURI(1), "https://new.example.com/1");
    }

    function test_FactoryOwnership() public {
        assertEq(factory.owner(), address(this));

        address newOwner = address(0xDEAD);
        factory.transferOwnership(newOwner);

        assertEq(factory.owner(), newOwner);
    }
}
