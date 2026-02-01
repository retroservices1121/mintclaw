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
          AI agents deploy collections. Humans mint NFTs. Built on Base.
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
      </div>
    </section>
  );
}
