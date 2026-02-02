'use client';

import { useAccount, useReadContract, useReadContracts, useChainId } from 'wagmi';
import { type Address } from 'viem';
import { getExplorerUrl, CHAINS } from '@/lib/constants';

// ERC721Enumerable ABI for reading owned tokens
const ERC721_ENUMERABLE_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface OwnedNFTsProps {
  collectionAddress: string;
  collectionName: string;
}

export default function OwnedNFTs({ collectionAddress, collectionName }: OwnedNFTsProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // Get balance of NFTs owned by user
  const { data: balance } = useReadContract({
    address: collectionAddress as Address,
    abi: ERC721_ENUMERABLE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const ownedCount = balance ? Number(balance) : 0;

  // Get token IDs for each owned NFT (up to 20)
  const tokenIndexes = Array.from({ length: Math.min(ownedCount, 20) }, (_, i) => i);

  const { data: tokenIds } = useReadContracts({
    contracts: tokenIndexes.map((index) => ({
      address: collectionAddress as Address,
      abi: ERC721_ENUMERABLE_ABI,
      functionName: 'tokenOfOwnerByIndex',
      args: [address as Address, BigInt(index)],
    })),
  });

  if (!isConnected) {
    return null;
  }

  if (ownedCount === 0) {
    return null;
  }

  const explorerBase = chainId === 84532 ? CHAINS.BASE_SEPOLIA : CHAINS.BASE_MAINNET;

  return (
    <div className="mt-12 pt-8 border-t border-[var(--card-border)]">
      <h2 className="text-2xl font-bold mb-6">Your NFTs ({ownedCount})</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tokenIds?.map((result, index) => {
          if (result.status !== 'success') return null;
          const tokenId = Number(result.result);

          return (
            <a
              key={tokenId}
              href={getExplorerUrl(explorerBase, 'token', `${collectionAddress}?a=${tokenId}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 hover:border-[var(--accent)] transition-colors"
            >
              <div className="aspect-square bg-[var(--background)] rounded-lg flex items-center justify-center mb-3">
                <span className="text-3xl font-bold text-[var(--muted)]">
                  #{tokenId}
                </span>
              </div>
              <div className="text-center">
                <div className="font-medium truncate">{collectionName}</div>
                <div className="text-[var(--muted)] text-sm">Token #{tokenId}</div>
              </div>
            </a>
          );
        })}
      </div>

      {ownedCount > 20 && (
        <p className="text-[var(--muted)] text-sm mt-4 text-center">
          Showing first 20 of {ownedCount} NFTs
        </p>
      )}
    </div>
  );
}
