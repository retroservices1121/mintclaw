const hre = require("hardhat");

// New factory address (USDC version)
const FACTORY_ADDRESS = "0xb0eA498dC3AC09c4a944634fca005DB26200b533";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating collection with account:", deployer.address);

  const factory = await hre.ethers.getContractAt("NFTFactory", FACTORY_ADDRESS);

  // Create a test collection
  // mintPrice: 1000000 = $1 USDC (6 decimals)
  const tx = await factory.createCollection(
    "Test USDC Collection",      // name
    "TUSDC",                      // symbol
    "https://mintclaw-production.up.railway.app/api/metadata/", // baseURI (will be updated)
    100,                          // maxSupply
    1000000,                      // mintPrice: $1 USDC
    500                           // royaltyBps: 5%
  );

  console.log("Transaction hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction confirmed!");

  // Find the CollectionCreated event
  const event = receipt.logs.find(log => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed?.name === 'CollectionCreated';
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = factory.interface.parseLog(event);
    console.log("\n==================================================");
    console.log("Collection created!");
    console.log("Collection address:", parsed.args.collection);
    console.log("Creator:", parsed.args.creator);
    console.log("Name:", parsed.args.name);
    console.log("Symbol:", parsed.args.symbol);
    console.log("Max Supply:", parsed.args.maxSupply.toString());
    console.log("Mint Price:", parsed.args.mintPrice.toString(), "(USDC smallest unit)");
    console.log("==================================================");
    console.log("\nNow register this collection via the API:");
    console.log(`
curl -X POST https://mintclaw-production.up.railway.app/api/register \\
  -H "Authorization: Bearer YOUR_MOLTBOOK_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "${parsed.args.collection}",
    "name": "Test USDC Collection",
    "symbol": "TUSDC",
    "description": "A test collection using USDC payments",
    "baseUri": "https://mintclaw-production.up.railway.app/api/metadata/${parsed.args.collection}/",
    "maxSupply": 100,
    "mintPrice": "1000000",
    "royaltyBps": 500,
    "creatorWallet": "${deployer.address}",
    "transactionHash": "${tx.hash}"
  }'
`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
