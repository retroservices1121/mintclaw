import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { defineChain } from 'viem';

// Define Monad Testnet
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, monadTestnet],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [monadTestnet.id]: http('https://testnet-rpc.monad.xyz'),
  },
});

export const defaultChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '8453', 10);
