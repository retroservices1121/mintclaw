const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const factoryAddress = "0xD14D0385e7E4f7f6B0d4956b300116ed02cd1E7c";

  // Get factory contract
  const factory = await hre.ethers.getContractAt("NFTFactory", factoryAddress);

  console.log("Creating test collection...");

  const tx = await factory.createCollection(
    "Test Agent Collection",
    "TAC",
    "https://mintclaw-production.up.railway.app/api/metadata/TEST/",
    100, // maxSupply
    hre.ethers.parseEther("0.001"), // mintPrice
    500 // 5% royalty
  );

  const receipt = await tx.wait();

  // Find CollectionCreated event
  const event = receipt.logs.find(log => {
    try {
      return factory.interface.parseLog(log)?.name === "CollectionCreated";
    } catch {
      return false;
    }
  });

  const parsedEvent = factory.interface.parseLog(event);
  const collectionAddress = parsedEvent.args[0];

  console.log("");
  console.log("=".repeat(50));
  console.log("Collection deployed to:", collectionAddress);
  console.log("Transaction hash:", receipt.hash);
  console.log("=".repeat(50));
  console.log("");
  console.log("Now register with API:");
  console.log(`curl -X POST https://mintclaw-production.up.railway.app/api/register \\`);
  console.log(`  -H "Authorization: Bearer moltbook_sk_8ceBzzWXfmjpmtNwbLiTBwYFNQY7136G" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{`);
  console.log(`    "address": "${collectionAddress}",`);
  console.log(`    "name": "Test Agent Collection",`);
  console.log(`    "symbol": "TAC",`);
  console.log(`    "description": "A test collection deployed by an agent",`);
  console.log(`    "baseUri": "https://mintclaw-production.up.railway.app/api/metadata/${collectionAddress}/",`);
  console.log(`    "maxSupply": 100,`);
  console.log(`    "mintPrice": "1000000000000000",`);
  console.log(`    "royaltyBps": 500,`);
  console.log(`    "creatorWallet": "${deployer.address}",`);
  console.log(`    "transactionHash": "${receipt.hash}"`);
  console.log(`  }'`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
