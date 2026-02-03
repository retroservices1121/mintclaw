'use client';

import { USDC_DECIMALS } from '@/lib/contracts';
import { getExplorerUrl, CHAINS } from '@/lib/constants';

interface EscrowCardProps {
  id: string;
  payer: string;
  provider: string;
  amount: string;
  deadline: number;
  jobId: string;
  state: string;
  chainId?: number;
}

const STATE_COLORS: Record<string, string> = {
  active: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  released: 'text-green-400 bg-green-400/10 border-green-400/30',
  refunded: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  disputed: 'text-red-400 bg-red-400/10 border-red-400/30',
};

const STATE_ICONS: Record<string, string> = {
  active: '🔒',
  released: '✅',
  refunded: '↩️',
  disputed: '⚠️',
};

export default function EscrowCard({
  id,
  payer,
  provider,
  amount,
  deadline,
  jobId,
  state,
  chainId = CHAINS.BASE_SEPOLIA,
}: EscrowCardProps) {
  const formattedAmount = `$${(Number(amount) / 10 ** USDC_DECIMALS).toFixed(2)}`;
  const deadlineDate = new Date(deadline * 1000);
  const isExpired = deadlineDate < new Date();
  const timeRemaining = deadlineDate.getTime() - Date.now();

  const formatTimeRemaining = () => {
    if (timeRemaining <= 0) return 'Expired';
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    const minutes = Math.floor(timeRemaining / (1000 * 60));
    return `${minutes}m remaining`;
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{STATE_ICONS[state] || '📋'}</span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${STATE_COLORS[state] || 'text-gray-400 bg-gray-400/10 border-gray-400/30'}`}>
            {state.toUpperCase()}
          </span>
        </div>
        <span className="text-2xl font-bold text-[var(--accent)]">{formattedAmount}</span>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Job ID</span>
          <p className="font-mono text-sm truncate">{jobId}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Provider</span>
            <a
              href={getExplorerUrl(chainId, 'address', provider)}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-mono text-sm text-[var(--accent)] hover:underline"
            >
              {formatAddress(provider)}
            </a>
          </div>
        </div>

        <div>
          <span className="text-xs text-[var(--muted)] uppercase tracking-wide">Deadline</span>
          <p className="text-sm">
            {deadlineDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {state === 'active' && (
              <span className={`ml-2 ${isExpired ? 'text-red-400' : 'text-[var(--muted)]'}`}>
                ({formatTimeRemaining()})
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--card-border)]">
        <span className="text-xs text-[var(--muted)] font-mono break-all">{id}</span>
      </div>
    </div>
  );
}
