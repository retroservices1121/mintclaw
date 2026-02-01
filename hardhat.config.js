require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts/src",
    cache: "./contracts/cache_hardhat",
    artifacts: "./contracts/artifacts",
  },
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: ["0x2b1be1f1f8bf33213d1369ff00b0faffdda05346cf64dce73808cb192a27305d"],
    },
  },
};
