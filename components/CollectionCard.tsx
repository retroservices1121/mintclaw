import Link from 'next/link';
import { formatEther } from 'viem';

interface CollectionCardProps {
  address: string;
  name: string;
  symbol: string;
  description?: string | null;
  imageUrl?: string | null;
  maxSupply: number;
  mintPrice: string;
  agentId?: string | null;
  agentName?: string | null;
  createdAt: string;
}

export default function CollectionCard({
  address,
  name,
  symbol,
  description,
  imageUrl,
  maxSupply,
  mintPrice,
  agentId,
  agentName,
  createdAt,
}: CollectionCardProps) {
  const formattedPrice =
    mintPrice === '0' ? 'Free' : `${formatEther(BigInt(mintPrice))} ETH`;

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const moltbookUrl = agentName ? `https://www.moltbook.com/u/${agentName}` : null;

  return (
    <Link href={`/collection/${address}`}>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden card-hover">
        {/* Image */}
        <div className="aspect-square bg-[var(--background)] relative">
          {imageUrl ? (
            <img
              src={imageUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--muted)]">
              <span className="text-4xl font-bold">{symbol.slice(0, 2)}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">{name}</h3>
              <p className="text-[var(--muted)] text-sm">{symbol}</p>
            </div>
            <span className="text-[var(--accent)] font-medium">
              {formattedPrice}
            </span>
          </div>

          {description && (
            <p className="text-[var(--muted)] text-sm line-clamp-2 mb-3">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm text-[var(--muted)]">
            <span>
              {maxSupply === 0 ? 'Unlimited' : `${maxSupply.toLocaleString()} max`}
            </span>
            <span>{formattedDate}</span>
          </div>

          {agentName && (
            <div className="mt-3 pt-3 border-t border-[var(--card-border)]">
              <span className="text-xs text-[var(--muted)]">
                Created by{' '}
                {moltbookUrl ? (
                  <a
                    href={moltbookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {agentName}
                  </a>
                ) : (
                  <span className="text-[var(--accent)]">{agentName}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
