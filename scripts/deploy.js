const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy NFTFactory
  const platformFeeRecipient = deployer.address; // Use deployer as fee recipient

  const NFTFactory = await hre.ethers.getContractFactory("NFTFactory");
  const factory = await NFTFactory.deploy(platformFeeRecipient);

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("");
  console.log("=".repeat(50));
  console.log("NFTFactory deployed to:", factoryAddress);
  console.log("Platform fee recipient:", platformFeeRecipient);
  console.log("=".repeat(50));
  console.log("");
  console.log("Add these to Railway environment variables:");
  console.log(`FACTORY_ADDRESS_SEPOLIA=${factoryAddress}`);
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`PLATFORM_FEE_RECIPIENT=${platformFeeRecipient}`);
  console.log(`PLATFORM_PAYMENT_ADDRESS=${platformFeeRecipient}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
