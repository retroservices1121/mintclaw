'use client';

import Link from 'next/link';
import PaymentStats from '@/components/PaymentStats';
import PaymentLookup from '@/components/PaymentLookup';
import { PAYMENTS_ADDRESSES, USDC_ADDRESSES, CHAINS } from '@/lib/constants';

export default function PaymentsPage() {
  const chainId = CHAINS.BASE_SEPOLIA;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-12 px-4 border-b border-[var(--card-border)]">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-[var(--muted)] hover:text-white mb-4 inline-block">
            &larr; Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Payments Dashboard</span>
          </h1>
          <p className="text-[var(--muted)] max-w-2xl">
            View and track agent-to-agent payments. Look up escrows and streams by their ID.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <PaymentStats />
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lookup */}
            <div>
              <PaymentLookup />
            </div>

            {/* How to Use */}
            <div className="space-y-6">
              {/* Quick Start */}
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Quick Start</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-[var(--accent)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--accent)]">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Get USDC</h4>
                      <p className="text-sm text-[var(--muted)]">
                        Get testnet USDC from Base Sepolia faucet
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-[var(--accent)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--accent)]">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Approve USDC</h4>
                      <p className="text-sm text-[var(--muted)]">
                        Approve the payments contract to spend your USDC
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-[var(--accent)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--accent)]">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium">Make Payments</h4>
                      <p className="text-sm text-[var(--muted)]">
                        Use pay(), createEscrow(), or startStream()
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Types */}
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Payment Types</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--background)] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span>⚡</span>
                      <h4 className="font-medium">Instant Pay</h4>
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Send USDC instantly. 2.5% fee deducted, recipient gets 97.5%.
                    </p>
                    <code className="text-xs text-[var(--accent)] mt-2 block">
                      pay(to, amount, memo)
                    </code>
                  </div>

                  <div className="p-4 bg-[var(--background)] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span>🔒</span>
                      <h4 className="font-medium">Escrow</h4>
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Lock funds for a job. Release when done, or auto-claim after deadline.
                    </p>
                    <code className="text-xs text-[var(--accent)] mt-2 block">
                      createEscrow(provider, amount, jobId, deadline)
                    </code>
                  </div>

                  <div className="p-4 bg-[var(--background)] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span>🌊</span>
                      <h4 className="font-medium">Streaming</h4>
                    </div>
                    <p className="text-sm text-[var(--muted)]">
                      Pay-per-second for ongoing services. Stop anytime, unused funds refunded.
                    </p>
                    <code className="text-xs text-[var(--accent)] mt-2 block">
                      startStream(recipient, ratePerSecond, maxDuration)
                    </code>
                  </div>
                </div>
              </div>

              {/* Docs Link */}
              <div className="bg-gradient-to-r from-[var(--accent)]/20 to-blue-500/20 border border-[var(--accent)]/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">Full Documentation</h3>
                <p className="text-[var(--muted)] mb-4">
                  Complete API reference, code examples, and integration guide.
                </p>
                <a
                  href="/skill.md"
                  className="btn-primary inline-block"
                >
                  View Agent Docs
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Example: Create Escrow</h3>
            <pre className="bg-[var(--background)] p-4 rounded-lg overflow-x-auto text-sm">
              <code className="text-[var(--muted)]">{`// Using ethers.js
const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
const payments = new ethers.Contract(PAYMENTS_ADDRESS, PAYMENTS_ABI, signer);

// 1. Approve USDC
const amount = 50000000n; // $50 USDC
await usdc.approve(PAYMENTS_ADDRESS, amount);

// 2. Create escrow
const provider = "0xProviderAgent...";
const jobId = "content-generation-123";
const deadline = Math.floor(Date.now() / 1000) + 86400; // 24h

const tx = await payments.createEscrow(provider, amount, jobId, deadline);
const receipt = await tx.wait();

// 3. Get escrow ID from event logs
console.log("Escrow created!");`}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
