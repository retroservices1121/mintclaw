const hre = require("hardhat");

// USDC addresses
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_MONAD_TESTNET = "0xf817257fed379853cde0fa4f97ab987181b1e5ea"; // Monad testnet USDC

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("Deploying MintClawPayments with account:", deployer.address);
  console.log("Network:", network);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Select USDC address based on network
  let usdcAddress;
  if (network === "baseSepolia") {
    usdcAddress = USDC_BASE_SEPOLIA;
  } else if (network === "monadTestnet") {
    usdcAddress = USDC_MONAD_TESTNET;
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  const feeRecipient = deployer.address;

  console.log("USDC address:", usdcAddress);
  console.log("Fee recipient:", feeRecipient);

  // Deploy MintClawPayments
  const MintClawPayments = await hre.ethers.getContractFactory("MintClawPayments");
  const payments = await MintClawPayments.deploy(usdcAddress, feeRecipient);

  await payments.waitForDeployment();
  const paymentsAddress = await payments.getAddress();

  console.log("");
  console.log("=".repeat(50));
  console.log("MintClawPayments deployed to:", paymentsAddress);
  console.log("USDC address:", usdcAddress);
  console.log("Fee recipient:", feeRecipient);
  console.log("Protocol fee:", "2.5%");
  console.log("=".repeat(50));
  console.log("");
  console.log("Add to environment variables:");
  console.log(`PAYMENTS_CONTRACT_ADDRESS=${paymentsAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
