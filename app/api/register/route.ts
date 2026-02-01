import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { registerCollectionSchema } from '@/lib/validation';
import { verifyFactoryDeployment } from '@/lib/deploy';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  // Authenticate the request
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate input
    const parseResult = registerCollectionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const chainId = input.chainId || 8453;

    // Check if collection is already registered
    const existing = await prisma.collection.findUnique({
      where: { address: input.address },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Collection already registered' },
        { status: 409 }
      );
    }

    // Verify the collection was deployed via our factory
    const isFromFactory = await verifyFactoryDeployment(
      input.address as `0x${string}`,
      chainId
    );

    if (!isFromFactory) {
      return NextResponse.json(
        { error: 'Collection was not deployed via MintClaw factory' },
        { status: 400 }
      );
    }

    // Store in database
    const collection = await prisma.collection.create({
      data: {
        address: input.address,
        name: input.name,
        symbol: input.symbol,
        description: input.description,
        imageUrl: input.imageUrl,
        baseUri: input.baseUri,
        maxSupply: input.maxSupply,
        mintPrice: input.mintPrice,
        royaltyBps: input.royaltyBps,
        creatorWallet: input.creatorWallet,
        transactionHash: input.transactionHash,
        deploymentType: 'self',
        agentId: authResult.agent.id,
        agentName: authResult.agent.name,
      },
    });

    return NextResponse.json({
      success: true,
      collection: {
        id: collection.id,
        address: collection.address,
        transactionHash: collection.transactionHash,
        name: collection.name,
        symbol: collection.symbol,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    );
  }
}
