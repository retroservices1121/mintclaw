'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import MintButton from '@/components/MintButton';
import { getExplorerUrl, CHAINS } from '@/lib/constants';
import { USDC_DECIMALS } from '@/lib/contracts';

interface CollectionData {
  id: string;
  address: string;
  name: string;
  symbol: string;
  description: string | null;
  imageUrl: string | null;
  baseUri: string;
  maxSupply: number;
  mintPrice: string;
  royaltyBps: number;
  creatorWallet: string;
  transactionHash: string;
  deploymentType: string;
  agentId: string | null;
  agentName: string | null;
  createdAt: string;
  totalMinted: number;
  mintingEnabled: boolean;
}

export default function CollectionPage() {
  const params = useParams();
  const address = params.address as string;

  const { data: collection, isLoading, error } = useQuery<CollectionData>({
    queryKey: ['collection', address],
    queryFn: async () => {
      const res = await fetch(`/api/collections/${address}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Collection not found');
        throw new Error('Failed to fetch collection');
      }
      return res.json();
    },
    enabled: !!address,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="aspect-square bg-[var(--card-border)] rounded-xl" />
            <div className="space-y-6">
              <div className="h-10 bg-[var(--card-border)] rounded w-3/4" />
              <div className="h-6 bg-[var(--card-border)] rounded w-1/4" />
              <div className="h-24 bg-[var(--card-border)] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center py-16">
          <h1 className="text-3xl font-bold mb-4">Collection Not Found</h1>
          <p className="text-[var(--muted)] mb-8">
            This collection doesn&apos;t exist or hasn&apos;t been registered yet.
          </p>
          <a href="/" className="btn-primary">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  const formattedPrice =
    collection.mintPrice === '0'
      ? 'Free'
      : `$${(Number(collection.mintPrice) / 10 ** USDC_DECIMALS).toFixed(2)} USDC`;

  const royaltyPercent = collection.royaltyBps / 100;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Image */}
        <div className="aspect-square bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
          {collection.imageUrl ? (
            <img
              src={collection.imageUrl.replace(
                'ipfs://',
                'https://gateway.pinata.cloud/ipfs/'
              )}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
              <span className="text-6xl font-bold">
                {collection.symbol.slice(0, 2)}
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{collection.name}</h1>
            <p className="text-[var(--muted)] text-lg">{collection.symbol}</p>
          </div>

          {collection.description && (
            <p className="text-[var(--muted)]">{collection.description}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--card-border)]">
              <div className="text-2xl font-bold">{formattedPrice}</div>
              <div className="text-[var(--muted)] text-sm">Mint Price</div>
            </div>
            <div className="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--card-border)]">
              <div className="text-2xl font-bold">
                {collection.maxSupply === 0
                  ? 'Unlimited'
                  : collection.maxSupply.toLocaleString()}
              </div>
              <div className="text-[var(--muted)] text-sm">Max Supply</div>
            </div>
            <div className="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--card-border)]">
              <div className="text-2xl font-bold">
                {collection.totalMinted.toLocaleString()}
              </div>
              <div className="text-[var(--muted)] text-sm">Minted</div>
            </div>
            <div className="bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--card-border)]">
              <div className="text-2xl font-bold">{royaltyPercent}%</div>
              <div className="text-[var(--muted)] text-sm">Royalty</div>
            </div>
          </div>

          {/* Mint Button */}
          <MintButton
            collectionAddress={collection.address}
            mintPrice={collection.mintPrice}
            maxSupply={collection.maxSupply}
            totalMinted={collection.totalMinted}
            mintingEnabled={collection.mintingEnabled}
          />

          {/* Additional Info */}
          <div className="space-y-3 pt-4 border-t border-[var(--card-border)]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Contract</span>
              <a
                href={getExplorerUrl(CHAINS.BASE_MAINNET, 'address', collection.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline font-mono"
              >
                {collection.address.slice(0, 6)}...{collection.address.slice(-4)}
              </a>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Creator</span>
              <a
                href={getExplorerUrl(CHAINS.BASE_MAINNET, 'address', collection.creatorWallet)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline font-mono"
              >
                {collection.creatorWallet.slice(0, 6)}...
                {collection.creatorWallet.slice(-4)}
              </a>
            </div>

            {collection.agentName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Deployed by</span>
                {collection.agentName ? (
                  <a
                    href={`https://www.moltbook.com/u/${collection.agentName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    {collection.agentName}
                  </a>
                ) : (
                  <span className="text-[var(--accent)]">{collection.agentName}</span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Deployment</span>
              <span className="capitalize">{collection.deploymentType}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Status</span>
              <span
                className={
                  collection.mintingEnabled ? 'text-green-500' : 'text-yellow-500'
                }
              >
                {collection.mintingEnabled ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
