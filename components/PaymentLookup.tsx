'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import EscrowCard from './EscrowCard';
import StreamCard from './StreamCard';
import { CHAINS } from '@/lib/constants';

type LookupType = 'escrow' | 'stream';

interface EscrowData {
  id: string;
  payer: string;
  provider: string;
  amount: string;
  deadline: number;
  jobId: string;
  state: string;
}

interface StreamData {
  id: string;
  payer: string;
  recipient: string;
  ratePerSecond: string;
  startTime: number;
  maxDuration: number;
  totalDeposit: string;
  withdrawn: string;
  withdrawable: string;
  active: boolean;
}

export default function PaymentLookup() {
  const [lookupType, setLookupType] = useState<LookupType>('escrow');
  const [inputId, setInputId] = useState('');
  const [searchId, setSearchId] = useState('');
  const chainId = CHAINS.BASE_SEPOLIA;

  const { data: escrowData, isLoading: escrowLoading, error: escrowError } = useQuery({
    queryKey: ['escrow', searchId, chainId],
    queryFn: async () => {
      if (!searchId || lookupType !== 'escrow') return null;
      const res = await fetch(`/api/payments/escrow/${searchId}?chainId=${chainId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch escrow');
      }
      const data = await res.json();
      return data.escrow as EscrowData;
    },
    enabled: !!searchId && lookupType === 'escrow',
    retry: false,
  });

  const { data: streamData, isLoading: streamLoading, error: streamError } = useQuery({
    queryKey: ['stream', searchId, chainId],
    queryFn: async () => {
      if (!searchId || lookupType !== 'stream') return null;
      const res = await fetch(`/api/payments/stream/${searchId}?chainId=${chainId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch stream');
      }
      const data = await res.json();
      return data.stream as StreamData;
    },
    enabled: !!searchId && lookupType === 'stream',
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputId.trim()) {
      setSearchId(inputId.trim());
    }
  };

  const isLoading = escrowLoading || streamLoading;
  const error = lookupType === 'escrow' ? escrowError : streamError;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">Lookup Payment</h3>

      {/* Type selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setLookupType('escrow');
            setSearchId('');
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            lookupType === 'escrow'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--card-border)] hover:bg-[var(--muted)]/20'
          }`}
        >
          🔒 Escrow
        </button>
        <button
          onClick={() => {
            setLookupType('stream');
            setSearchId('');
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            lookupType === 'stream'
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--card-border)] hover:bg-[var(--muted)]/20'
          }`}
        >
          🌊 Stream
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
          placeholder={`Enter ${lookupType} ID (0x...)`}
          className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--card-border)] rounded-lg focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
        />
        <button
          type="submit"
          disabled={isLoading || !inputId.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Search'}
        </button>
      </form>

      {/* Results */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {(error as Error).message}
        </div>
      )}

      {escrowData && lookupType === 'escrow' && (
        <EscrowCard
          id={escrowData.id}
          payer={escrowData.payer}
          provider={escrowData.provider}
          amount={escrowData.amount}
          deadline={escrowData.deadline}
          jobId={escrowData.jobId}
          state={escrowData.state}
          chainId={chainId}
        />
      )}

      {streamData && lookupType === 'stream' && (
        <StreamCard
          id={streamData.id}
          payer={streamData.payer}
          recipient={streamData.recipient}
          ratePerSecond={streamData.ratePerSecond}
          startTime={streamData.startTime}
          maxDuration={streamData.maxDuration}
          totalDeposit={streamData.totalDeposit}
          withdrawn={streamData.withdrawn}
          withdrawable={streamData.withdrawable}
          active={streamData.active}
          chainId={chainId}
        />
      )}

      {!error && !escrowData && !streamData && searchId && !isLoading && (
        <div className="text-center py-8 text-[var(--muted)]">
          No {lookupType} found with that ID
        </div>
      )}

      {!searchId && (
        <div className="text-center py-8 text-[var(--muted)]">
          Enter an {lookupType} ID to look up its status
        </div>
      )}
    </div>
  );
}
