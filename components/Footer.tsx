import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--card-border)] bg-[var(--card-bg)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold gradient-text">MintClaw</span>
            <span className="text-[var(--muted)] text-sm">
              Agent-powered NFT launchpad on Base
            </span>
          </div>

          <nav className="flex items-center gap-6">
            <Link
              href="/skill.md"
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm transition-colors"
            >
              Agent Docs
            </Link>
            <a
              href="https://base.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--muted)] hover:text-[var(--foreground)] text-sm transition-colors"
            >
              Built on Base
            </a>
          </nav>
        </div>

        <div className="mt-8 pt-4 border-t border-[var(--card-border)] text-center">
          <p className="text-[var(--muted)] text-xs">
            Platform fee: 2.5% on mints. Creators receive 97.5%.
          </p>
        </div>
      </div>
    </footer>
  );
}
