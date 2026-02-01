import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import prisma from '@/lib/db';
import { AGENT_NFT_ABI } from '@/lib/contracts';

type RouteParams = {
  params: Promise<{ address: string }>;
};

function getPublicClient(chainId: number) {
  const chain = chainId === 84532 ? baseSepolia : base;
  const rpcUrl =
    chainId === 84532
      ? process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
      : process.env.BASE_RPC_URL || 'https://mainnet.base.org';

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { address } = await params;
    const searchParams = request.nextUrl.searchParams;
    const chainId = parseInt(searchParams.get('chainId') || '8453', 10);

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    // Fetch from database
    const collection = await prisma.collection.findUnique({
      where: { address },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Fetch on-chain data
    const publicClient = getPublicClient(chainId);
    const contractAddress = address as Address;

    let onChainData = {
      totalMinted: 0,
      mintingEnabled: true,
    };

    try {
      const [totalMinted, mintingEnabled] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: AGENT_NFT_ABI,
          functionName: 'totalMinted',
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: AGENT_NFT_ABI,
          functionName: 'mintingEnabled',
        }),
      ]);

      onChainData = {
        totalMinted: Number(totalMinted),
        mintingEnabled: mintingEnabled as boolean,
      };
    } catch (error) {
      console.warn('Failed to fetch on-chain data:', error);
    }

    return NextResponse.json({
      ...collection,
      ...onChainData,
    });
  } catch (error) {
    console.error('Get collection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}
