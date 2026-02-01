import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const creator = searchParams.get('creator');
    const agentId = searchParams.get('agentId');

    const where: Record<string, unknown> = {};
    if (creator) {
      where.creatorWallet = creator;
    }
    if (agentId) {
      where.agentId = agentId;
    }

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          address: true,
          name: true,
          symbol: true,
          description: true,
          imageUrl: true,
          maxSupply: true,
          mintPrice: true,
          royaltyBps: true,
          creatorWallet: true,
          deploymentType: true,
          agentId: true,
          agentName: true,
          createdAt: true,
        },
      }),
      prisma.collection.count({ where }),
    ]);

    return NextResponse.json({
      collections,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + collections.length < total,
      },
    });
  } catch (error) {
    console.error('List collections error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}
