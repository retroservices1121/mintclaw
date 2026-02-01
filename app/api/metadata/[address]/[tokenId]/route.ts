import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { ipfsToHttp } from '@/lib/ipfs';

type RouteParams = {
  params: Promise<{ address: string; tokenId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { address, tokenId } = await params;

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    // Validate tokenId
    const tokenIdNum = parseInt(tokenId, 10);
    if (isNaN(tokenIdNum) || tokenIdNum < 1) {
      return NextResponse.json({ error: 'Invalid token ID' }, { status: 400 });
    }

    // Fetch collection from database
    const collection = await prisma.collection.findUnique({
      where: { address },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Generate metadata
    // This is a simple implementation - in production you might want to
    // store per-token metadata or generate it dynamically based on traits
    const metadata = {
      name: `${collection.name} #${tokenId}`,
      description: collection.description || `A MintClaw NFT from the ${collection.name} collection`,
      image: collection.imageUrl ? ipfsToHttp(collection.imageUrl) : undefined,
      external_url: `${process.env.NEXT_PUBLIC_SITE_URL}/collection/${address}`,
      attributes: [
        {
          trait_type: 'Collection',
          value: collection.name,
        },
        {
          trait_type: 'Token ID',
          display_type: 'number',
          value: tokenIdNum,
        },
      ],
    };

    // Set caching headers for metadata
    return NextResponse.json(metadata, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('Metadata error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
