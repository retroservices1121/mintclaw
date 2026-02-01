const hre = require("hardhat");

// USDC addresses
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Network:", network);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Select USDC address based on network
  const usdcAddress = network === "baseSepolia" ? USDC_BASE_SEPOLIA : USDC_BASE_MAINNET;
  const platformFeeRecipient = deployer.address;

  console.log("USDC address:", usdcAddress);

  // Deploy NFTFactory
  const NFTFactory = await hre.ethers.getContractFactory("NFTFactory");
  const factory = await NFTFactory.deploy(platformFeeRecipient, usdcAddress);

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("");
  console.log("=".repeat(50));
  console.log("NFTFactory deployed to:", factoryAddress);
  console.log("Platform fee recipient:", platformFeeRecipient);
  console.log("USDC address:", usdcAddress);
  console.log("=".repeat(50));
  console.log("");
  console.log("Add these to Railway environment variables:");
  if (network === "baseSepolia") {
    console.log(`FACTORY_ADDRESS_SEPOLIA=${factoryAddress}`);
  } else {
    console.log(`FACTORY_ADDRESS=${factoryAddress}`);
  }
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
