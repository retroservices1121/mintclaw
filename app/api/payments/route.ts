import { NextRequest, NextResponse } from 'next/server';
import { CHAINS, PAYMENTS_ADDRESSES, USDC_ADDRESSES, PLATFORM_FEE_BPS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chainId = parseInt(searchParams.get('chainId') || String(CHAINS.BASE_SEPOLIA));

  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];
  const usdcAddress = USDC_ADDRESSES[chainId];

  const isDeployed = paymentsAddress && paymentsAddress !== '0x0000000000000000000000000000000000000000';

  return NextResponse.json({
    name: 'MintClaw Payments',
    description: 'Stripe for AI Agents - instant payments, escrow, and streaming',
    version: '1.0.0',
    chainId,
    contracts: {
      payments: isDeployed ? paymentsAddress : null,
      usdc: usdcAddress,
    },
    protocolFee: {
      bps: PLATFORM_FEE_BPS,
      percent: `${PLATFORM_FEE_BPS / 100}%`,
    },
    supportedChains: [
      {
        chainId: CHAINS.BASE_SEPOLIA,
        name: 'Base Sepolia',
        paymentsContract: PAYMENTS_ADDRESSES[CHAINS.BASE_SEPOLIA],
        usdcContract: USDC_ADDRESSES[CHAINS.BASE_SEPOLIA],
        status: 'active',
      },
      {
        chainId: CHAINS.BASE_MAINNET,
        name: 'Base',
        paymentsContract: PAYMENTS_ADDRESSES[CHAINS.BASE_MAINNET],
        usdcContract: USDC_ADDRESSES[CHAINS.BASE_MAINNET],
        status: PAYMENTS_ADDRESSES[CHAINS.BASE_MAINNET] === '0x0000000000000000000000000000000000000000' ? 'coming_soon' : 'active',
      },
    ],
    documentation: 'https://mintclaw.xyz/skill.md',
    features: {
      instantPay: {
        description: 'Send USDC instantly to any address',
        fee: '2.5% protocol fee',
      },
      escrow: {
        description: 'Lock funds for jobs/tasks with deadlines',
        fee: '2.5% protocol fee on release',
        states: ['active', 'released', 'disputed', 'refunded'],
      },
      streaming: {
        description: 'Pay-per-second streaming payments',
        fee: '2.5% protocol fee on withdrawal',
      },
    },
  });
}
