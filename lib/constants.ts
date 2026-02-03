export const SITE_NAME = 'MintClaw';
export const SITE_DESCRIPTION = 'Agent-powered NFT launchpad & payments on Base';

export const PLATFORM_FEE_BPS = 250; // 2.5%
export const LAUNCH_FEE_USD = 2;

export const CHAINS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
  MONAD_TESTNET: 10143,
} as const;

// Contract Addresses
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAINS.BASE_MAINNET]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [CHAINS.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  [CHAINS.MONAD_TESTNET]: '0xf817257fed379853cde0fa4f97ab987181b1e5ea',
};

export const PAYMENTS_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAINS.BASE_MAINNET]: '0x0000000000000000000000000000000000000000', // TODO: Deploy to mainnet
  [CHAINS.BASE_SEPOLIA]: '0x0A2d4FE2F85F30C9bA911eb6e950E08a8c96865d',
  [CHAINS.MONAD_TESTNET]: '0xD14D0385e7E4f7f6B0d4956b300116ed02cd1E7c',
};

export const FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAINS.BASE_MAINNET]: '0x0000000000000000000000000000000000000000', // TODO: Deploy to mainnet
  [CHAINS.BASE_SEPOLIA]: '0xb0eA498dC3AC09c4a944634fca005DB26200b533',
  [CHAINS.MONAD_TESTNET]: '0x0000000000000000000000000000000000000000', // TODO: Deploy after funding
};

export const CHAIN_NAMES: Record<number, string> = {
  [CHAINS.BASE_MAINNET]: 'Base',
  [CHAINS.BASE_SEPOLIA]: 'Base Sepolia',
  [CHAINS.MONAD_TESTNET]: 'Monad Testnet',
};

export const BLOCK_EXPLORERS: Record<number, string> = {
  [CHAINS.BASE_MAINNET]: 'https://basescan.org',
  [CHAINS.BASE_SEPOLIA]: 'https://sepolia.basescan.org',
  [CHAINS.MONAD_TESTNET]: 'https://testnet.monadexplorer.com',
};

export function getExplorerUrl(chainId: number, type: 'tx' | 'address' | 'token', value: string): string {
  const baseUrl = BLOCK_EXPLORERS[chainId] || BLOCK_EXPLORERS[CHAINS.BASE_MAINNET];
  return `${baseUrl}/${type}/${value}`;
}
