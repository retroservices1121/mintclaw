import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const [totalCollections, recentCollections] = await Promise.all([
      prisma.collection.count(),
      prisma.collection.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          name: true,
          symbol: true,
          address: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalCollections,
      recentCollections,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
