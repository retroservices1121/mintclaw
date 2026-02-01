export const SITE_NAME = 'MintClaw';
export const SITE_DESCRIPTION = 'Agent-powered NFT launchpad on Base';

export const PLATFORM_FEE_BPS = 250; // 2.5%
export const LAUNCH_FEE_USD = 2;

export const CHAINS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const;

export const CHAIN_NAMES: Record<number, string> = {
  [CHAINS.BASE_MAINNET]: 'Base',
  [CHAINS.BASE_SEPOLIA]: 'Base Sepolia',
};

export const BLOCK_EXPLORERS: Record<number, string> = {
  [CHAINS.BASE_MAINNET]: 'https://basescan.org',
  [CHAINS.BASE_SEPOLIA]: 'https://sepolia.basescan.org',
};

export function getExplorerUrl(chainId: number, type: 'tx' | 'address', value: string): string {
  const baseUrl = BLOCK_EXPLORERS[chainId] || BLOCK_EXPLORERS[CHAINS.BASE_MAINNET];
  return `${baseUrl}/${type}/${value}`;
}
