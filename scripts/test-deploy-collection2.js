const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const factoryAddress = "0xD14D0385e7E4f7f6B0d4956b300116ed02cd1E7c";
  const factory = await hre.ethers.getContractAt("NFTFactory", factoryAddress);

  console.log("Creating test collection #2...");

  const tx = await factory.createCollection(
    "Spredd Predictions",
    "SPRD",
    "https://mintclaw-production.up.railway.app/api/metadata/PLACEHOLDER/",
    50,
    hre.ethers.parseEther("0.0005"),
    250 // 2.5% royalty
  );

  const receipt = await tx.wait();
  const event = receipt.logs.find(log => {
    try {
      return factory.interface.parseLog(log)?.name === "CollectionCreated";
    } catch {
      return false;
    }
  });

  const parsedEvent = factory.interface.parseLog(event);
  const collectionAddress = parsedEvent.args[0];

  console.log("Collection:", collectionAddress);
  console.log("TxHash:", receipt.hash);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
