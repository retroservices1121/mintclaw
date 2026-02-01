// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/NFTFactory.sol";

contract DeployScript is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address platformFeeRecipient = vm.envAddress("PLATFORM_FEE_RECIPIENT");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy factory
        NFTFactory factory = new NFTFactory(platformFeeRecipient);

        console.log("NFTFactory deployed at:", address(factory));
        console.log("Platform fee recipient:", platformFeeRecipient);

        vm.stopBroadcast();
    }
}
