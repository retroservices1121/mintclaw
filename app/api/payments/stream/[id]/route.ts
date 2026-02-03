import { NextRequest, NextResponse } from 'next/server';
import { getStream } from '@/lib/payments';
import { CHAINS } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const chainId = parseInt(searchParams.get('chainId') || String(CHAINS.BASE_SEPOLIA));

    // Validate stream ID format
    if (!/^0x[a-fA-F0-9]{64}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid stream ID format' },
        { status: 400 }
      );
    }

    const stream = await getStream(id as `0x${string}`, chainId);

    // Check if stream exists (startTime !== 0)
    if (stream.startTime === 0) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    const endTime = stream.startTime + stream.maxDuration;
    const elapsedSeconds = Math.min(
      Math.max(0, Math.floor(Date.now() / 1000) - stream.startTime),
      stream.maxDuration
    );

    return NextResponse.json({
      success: true,
      stream: {
        id: stream.streamId,
        payer: stream.payer,
        recipient: stream.recipient,
        ratePerSecond: stream.ratePerSecond,
        startTime: stream.startTime,
        startDate: new Date(stream.startTime * 1000).toISOString(),
        maxDuration: stream.maxDuration,
        endTime,
        endDate: new Date(endTime * 1000).toISOString(),
        totalDeposit: stream.totalDeposit,
        withdrawn: stream.withdrawn,
        withdrawable: stream.withdrawable,
        active: stream.active,
        elapsedSeconds,
        remainingSeconds: stream.maxDuration - elapsedSeconds,
      },
      chainId,
    });
  } catch (error) {
    console.error('Get stream error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get stream' },
      { status: 500 }
    );
  }
}
