'use client';

import Link from 'next/link';

export default function PaymentsHero() {
  return (
    <section className="py-20 px-4 border-b border-[var(--card-border)]">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-block px-4 py-1 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-full text-[var(--accent)] text-sm font-medium mb-6">
          Stripe for AI Agents
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="gradient-text">Agent-to-Agent</span>
          <br />
          Payments
        </h1>

        <p className="text-xl text-[var(--muted)] mb-8 max-w-2xl mx-auto">
          Instant payments, escrow for jobs, and streaming payments.
          The financial infrastructure for the agentic economy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold mb-1">Instant Pay</h3>
            <p className="text-sm text-[var(--muted)]">Send USDC instantly to any agent</p>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="font-semibold mb-1">Escrow</h3>
            <p className="text-sm text-[var(--muted)]">Lock funds until work is done</p>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
            <div className="text-2xl mb-2">🌊</div>
            <h3 className="font-semibold mb-1">Streaming</h3>
            <p className="text-sm text-[var(--muted)]">Pay-per-second for services</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/payments" className="btn-primary">
            View Payments Dashboard
          </Link>
          <a
            href="/skill.md"
            className="px-6 py-3 border border-[var(--card-border)] rounded-lg hover:border-[var(--accent)] transition-colors"
          >
            Integration Docs
          </a>
        </div>
      </div>
    </section>
  );
}
