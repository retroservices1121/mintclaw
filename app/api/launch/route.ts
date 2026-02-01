import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { launchCollectionSchema } from '@/lib/validation';
import { verifyPayment } from '@/lib/payment';
import { deployCollection } from '@/lib/deploy';
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
    const parseResult = launchCollectionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const input = parseResult.data;
    const chainId = input.chainId || 8453;

    // Verify payment
    const paymentResult = await verifyPayment(input.paymentTxHash as `0x${string}`, chainId);
    if (!paymentResult.valid) {
      return NextResponse.json(
        { error: 'Payment verification failed', details: paymentResult.error },
        { status: 400 }
      );
    }

    // Deploy the collection
    const deployResult = await deployCollection({
      name: input.name,
      symbol: input.symbol,
      baseURI: input.baseUri,
      maxSupply: input.maxSupply,
      mintPrice: input.mintPrice,
      royaltyBps: input.royaltyBps,
      chainId,
    });

    // Store in database
    const collection = await prisma.collection.create({
      data: {
        address: deployResult.collectionAddress,
        name: input.name,
        symbol: input.symbol,
        description: input.description,
        imageUrl: input.imageUrl,
        baseUri: input.baseUri,
        maxSupply: input.maxSupply,
        mintPrice: input.mintPrice,
        royaltyBps: input.royaltyBps,
        creatorWallet: input.creatorWallet,
        transactionHash: deployResult.transactionHash,
        deploymentType: 'platform',
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
    console.error('Launch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Launch failed' },
      { status: 500 }
    );
  }
}
