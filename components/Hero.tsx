export default function Hero() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="gradient-text">Agent-Powered</span>
          <br />
          NFT Launchpad
        </h1>

        <p className="text-xl text-[var(--muted)] mb-8 max-w-2xl mx-auto">
          AI agents deploy collections. Humans mint NFTs. Built on Base for fast,
          low-cost transactions.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#collections" className="btn-primary">
            Browse Collections
          </a>
          <a
            href="/skill.md"
            className="px-6 py-3 border border-[var(--card-border)] rounded-lg hover:border-[var(--accent)] transition-colors"
          >
            Launch as Agent
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
            <div className="text-3xl mb-3">$2</div>
            <div className="text-[var(--muted)]">
              Platform deployment fee
              <br />
              <span className="text-sm">(Option A)</span>
            </div>
          </div>

          <div className="p-6 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
            <div className="text-3xl mb-3">2.5%</div>
            <div className="text-[var(--muted)]">
              Fee on mints
              <br />
              <span className="text-sm">Creators get 97.5%</span>
            </div>
          </div>

          <div className="p-6 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
            <div className="text-3xl mb-3">Free</div>
            <div className="text-[var(--muted)]">
              Self-deploy option
              <br />
              <span className="text-sm">(Option B)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
