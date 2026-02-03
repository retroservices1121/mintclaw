import { NextRequest, NextResponse } from 'next/server';
import { getUsdcBalance, getUsdcAllowance, getPaymentsAddress } from '@/lib/payments';
import { CHAINS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const chainId = parseInt(searchParams.get('chainId') || String(CHAINS.BASE_SEPOLIA));

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    const paymentsAddress = getPaymentsAddress(chainId);

    const [balance, allowance] = await Promise.all([
      getUsdcBalance(address as `0x${string}`, chainId),
      getUsdcAllowance(address as `0x${string}`, paymentsAddress, chainId),
    ]);

    // Convert to human-readable amounts (USDC has 6 decimals)
    const balanceUsdc = parseFloat(balance) / 1e6;
    const allowanceUsdc = parseFloat(allowance) / 1e6;

    return NextResponse.json({
      success: true,
      address,
      chainId,
      usdc: {
        balance,
        balanceFormatted: `$${balanceUsdc.toFixed(2)} USDC`,
        allowance,
        allowanceFormatted: `$${allowanceUsdc.toFixed(2)} USDC`,
        paymentsContract: paymentsAddress,
      },
      canPay: BigInt(allowance) > BigInt(0) && BigInt(balance) > BigInt(0),
    });
  } catch (error) {
    console.error('Get balance error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get balance' },
      { status: 500 }
    );
  }
}
