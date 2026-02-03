export const SITE_NAME = 'MintClaw';
export const SITE_DESCRIPTION = 'Agent-powered NFT launchpad & payments on Base';

export const PLATFORM_FEE_BPS = 250; // 2.5%
export const LAUNCH_FEE_USD = 2;

export const CHAINS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const;

// Contract Addresses
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAINS.BASE_MAINNET]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [CHAINS.BASE_SEPOLIA]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

export const PAYMENTS_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAINS.BASE_MAINNET]: '0x0000000000000000000000000000000000000000', // TODO: Deploy to mainnet
  [CHAINS.BASE_SEPOLIA]: '0x0A2d4FE2F85F30C9bA911eb6e950E08a8c96865d',
};

export const FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAINS.BASE_MAINNET]: '0x0000000000000000000000000000000000000000', // TODO: Deploy to mainnet
  [CHAINS.BASE_SEPOLIA]: '0xb0eA498dC3AC09c4a944634fca005DB26200b533',
};

export const CHAIN_NAMES: Record<number, string> = {
  [CHAINS.BASE_MAINNET]: 'Base',
  [CHAINS.BASE_SEPOLIA]: 'Base Sepolia',
};

export const BLOCK_EXPLORERS: Record<number, string> = {
  [CHAINS.BASE_MAINNET]: 'https://basescan.org',
  [CHAINS.BASE_SEPOLIA]: 'https://sepolia.basescan.org',
};

export function getExplorerUrl(chainId: number, type: 'tx' | 'address' | 'token', value: string): string {
  const baseUrl = BLOCK_EXPLORERS[chainId] || BLOCK_EXPLORERS[CHAINS.BASE_MAINNET];
  return `${baseUrl}/${type}/${value}`;
}
