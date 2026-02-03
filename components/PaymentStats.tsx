'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { CHAINS, PAYMENTS_ADDRESSES, USDC_ADDRESSES, getExplorerUrl } from '@/lib/constants';

export default function PaymentStats() {
  const { address, isConnected } = useAccount();
  const chainId = CHAINS.BASE_SEPOLIA;

  const { data: balanceData } = useQuery({
    queryKey: ['usdc-balance', address, chainId],
    queryFn: async () => {
      if (!address) return null;
      const res = await fetch(`/api/payments/balance?address=${address}&chainId=${chainId}`);
      if (!res.ok) throw new Error('Failed to fetch balance');
      return res.json();
    },
    enabled: !!address,
    refetchInterval: 10000,
  });

  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];
  const usdcAddress = USDC_ADDRESSES[chainId];

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* USDC Balance */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <span className="text-xl">💵</span>
          </div>
          <span className="text-[var(--muted)]">Your USDC</span>
        </div>
        {isConnected && balanceData ? (
          <p className="text-2xl font-bold">{balanceData.usdc?.balanceFormatted || '$0.00'}</p>
        ) : (
          <p className="text-2xl font-bold text-[var(--muted)]">Connect wallet</p>
        )}
      </div>

      {/* Allowance */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
            <span className="text-xl">✅</span>
          </div>
          <span className="text-[var(--muted)]">Approved</span>
        </div>
        {isConnected && balanceData ? (
          <p className="text-2xl font-bold">{balanceData.usdc?.allowanceFormatted || '$0.00'}</p>
        ) : (
          <p className="text-2xl font-bold text-[var(--muted)]">-</p>
        )}
      </div>

      {/* Protocol Fee */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <span className="text-[var(--muted)]">Protocol Fee</span>
        </div>
        <p className="text-2xl font-bold">2.5%</p>
      </div>

      {/* Network */}
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[var(--accent)]/20 rounded-full flex items-center justify-center">
            <span className="text-xl">🔗</span>
          </div>
          <span className="text-[var(--muted)]">Network</span>
        </div>
        <p className="text-2xl font-bold">Base Sepolia</p>
      </div>

      {/* Contract Addresses - Full Width */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
        <h3 className="font-semibold mb-4">Contract Addresses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-[var(--muted)] uppercase tracking-wide">MintClawPayments</span>
            <a
              href={getExplorerUrl(chainId, 'address', paymentsAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-mono text-sm text-[var(--accent)] hover:underline break-all"
            >
              {paymentsAddress}
            </a>
          </div>
          <div>
            <span className="text-xs text-[var(--muted)] uppercase tracking-wide">USDC</span>
            <a
              href={getExplorerUrl(chainId, 'address', usdcAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-mono text-sm text-[var(--accent)] hover:underline break-all"
            >
              {usdcAddress}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
