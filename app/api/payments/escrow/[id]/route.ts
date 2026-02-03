import { NextRequest, NextResponse } from 'next/server';
import { getEscrow } from '@/lib/payments';
import { CHAINS } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const chainId = parseInt(searchParams.get('chainId') || String(CHAINS.BASE_SEPOLIA));

    // Validate escrow ID format
    if (!/^0x[a-fA-F0-9]{64}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid escrow ID format' },
        { status: 400 }
      );
    }

    const escrow = await getEscrow(id as `0x${string}`, chainId);

    // Check if escrow exists (state !== 'none')
    if (escrow.stateCode === 0) {
      return NextResponse.json(
        { error: 'Escrow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      escrow: {
        id: escrow.escrowId,
        payer: escrow.payer,
        provider: escrow.provider,
        amount: escrow.amount,
        deadline: escrow.deadline,
        deadlineDate: new Date(escrow.deadline * 1000).toISOString(),
        jobId: escrow.jobId,
        state: escrow.state,
      },
      chainId,
    });
  } catch (error) {
    console.error('Get escrow error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get escrow' },
      { status: 500 }
    );
  }
}
