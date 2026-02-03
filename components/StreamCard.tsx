'use client';

import { useEffect, useState } from 'react';
import { USDC_DECIMALS } from '@/lib/contracts';
import { getExplorerUrl, CHAINS } from '@/lib/constants';

interface StreamCardProps {
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
  chainId?: number;
}

export default function StreamCard({
  id,
  payer,
  recipient,
  ratePerSecond,
  startTime,
  maxDuration,
  totalDeposit,
  withdrawn,
  withdrawable,
  active,
  chainId = CHAINS.BASE_SEPOLIA,
}: StreamCardProps) {
  const [currentWithdrawable, setCurrentWithdrawable] = useState(withdrawable);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Real-time update of withdrawable amount
  useEffect(() => {
    if (!active) return;

    const updateElapsed = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = Math.min(now - startTime, maxDuration);
      setElapsedSeconds(elapsed);

      const totalEarned = BigInt(ratePerSecond) * BigInt(elapsed);
      const available = totalEarned - BigInt(withdrawn);
      setCurrentWithdrawable(available.toString());
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [active, startTime, maxDuration, ratePerSecond, withdrawn]);

  const formatUsdc = (amount: string) => `$${(Number(amount) / 10 ** USDC_DECIMALS).toFixed(2)}`;
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const ratePerHour = (Number(ratePerSecond) * 3600 / 10 ** USDC_DECIMALS).toFixed(2);
  const progress = maxDuration > 0 ? (elapsedSeconds / maxDuration) * 100 : 0;
  const endTime = startTime + maxDuration;
  const remainingSeconds = Math.max(0, maxDuration - elapsedSeconds);

  const formatDuration = (seconds: number) => {
    if (seconds >= 86400) {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    }
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      return `${mins}m`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{active ? '🌊' : '⏹️'}</span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${
            active
              ? 'text-green-400 bg-green-400/10 border-green-400/30'
              : 'text-gray-400 bg-gray-400/10 border-gray-400/30'
          }`}>
            {active ? 'ACTIVE' : 'STOPPED'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-[var(--accent)]">${ratePerHour}</span>
          <span className="text-sm text-[var(--muted)]">/hour</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
          <span>Progress</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-blue-500 transition-all duration-1000"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
          <span>{formatDuration(elapsedSeconds)} elapsed</span>
          <span>{formatDuration(remainingSeconds)} remaining</span>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[var(--background)] rounded-lg p-3 text-center">
          <span className="text-xs text-[var(--muted)] block mb-1">Total</span>
          <span className="font-semibold">{formatUsdc(totalDeposit)}</span>
        </div>
        <div className="bg-[var(--background)] rounded-lg p-3 text-center">
          <span className="text-xs text-[var(--muted)] block mb-1">Withdrawn</span>
          <span className="font-semibold">{formatUsdc(withdrawn)}</span>
        </div>
        <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-3 text-center">
          <span className="text-xs text-[var(--accent)] block mb-1">Available</span>
          <span className="font-semibold text-[var(--accent)]">{formatUsdc(currentWithdrawable)}</span>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Payer</span>
          <a
            href={getExplorerUrl(chainId, 'address', payer)}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-mono text-sm text-[var(--accent)] hover:underline"
          >
            {formatAddress(payer)}
          </a>
        </div>
        <div>
          <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Recipient</span>
          <a
            href={getExplorerUrl(chainId, 'address', recipient)}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-mono text-sm text-[var(--accent)] hover:underline"
          >
            {formatAddress(recipient)}
          </a>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <span className="text-xs text-[var(--muted)]">Started</span>
          <p>{new Date(startTime * 1000).toLocaleString()}</p>
        </div>
        <div>
          <span className="text-xs text-[var(--muted)]">Ends</span>
          <p>{new Date(endTime * 1000).toLocaleString()}</p>
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--card-border)]">
        <span className="text-xs text-[var(--muted)] font-mono break-all">{id}</span>
      </div>
    </div>
  );
}
