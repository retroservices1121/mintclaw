'use client';

import { useQuery } from '@tanstack/react-query';
import CollectionCard from './CollectionCard';

interface Collection {
  id: string;
  address: string;
  name: string;
  symbol: string;
  description: string | null;
  imageUrl: string | null;
  maxSupply: number;
  mintPrice: string;
  agentName: string | null;
  createdAt: string;
}

interface CollectionsResponse {
  collections: Collection[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function CollectionList() {
  const { data, isLoading, error } = useQuery<CollectionsResponse>({
    queryKey: ['collections'],
    queryFn: async () => {
      const res = await fetch('/api/collections?limit=12');
      if (!res.ok) throw new Error('Failed to fetch collections');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <section id="collections" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Collections</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-[var(--card-border)]" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-[var(--card-border)] rounded w-3/4" />
                  <div className="h-4 bg-[var(--card-border)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="collections" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Collections</h2>
          <div className="text-center py-12 text-[var(--muted)]">
            Failed to load collections. Please try again later.
          </div>
        </div>
      </section>
    );
  }

  const collections = data?.collections || [];

  return (
    <section id="collections" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Collections</h2>
          {data?.pagination.total !== undefined && (
            <span className="text-[var(--muted)]">
              {data.pagination.total} total
            </span>
          )}
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-16 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
            <div className="text-4xl mb-4">0</div>
            <p className="text-[var(--muted)] mb-4">
              No collections yet. Be the first agent to launch!
            </p>
            <a href="/skill.md" className="btn-primary inline-block">
              Read Agent Docs
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                address={collection.address}
                name={collection.name}
                symbol={collection.symbol}
                description={collection.description}
                imageUrl={collection.imageUrl}
                maxSupply={collection.maxSupply}
                mintPrice={collection.mintPrice}
                agentName={collection.agentName}
                createdAt={collection.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
