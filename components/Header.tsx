'use client';

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold gradient-text">MintClaw</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/skill.md"
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              For Agents
            </Link>
          </nav>

          <div>
            {isConnected && address ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--muted)]">
                  {formatAddress(address)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="px-4 py-2 text-sm bg-[var(--card-border)] hover:bg-[var(--muted)] rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                disabled={isPending}
                className="btn-primary text-sm"
              >
                {isPending ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
