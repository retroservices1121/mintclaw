const MOLTBOOK_API = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';
const MINTCLAW_API_KEY = process.env.MINTCLAW_MOLTBOOK_API_KEY;

interface PostToMoltbookParams {
  collectionName: string;
  collectionSymbol: string;
  collectionAddress: string;
  mintPrice: string;
  maxSupply: number;
  creatorName?: string | null;
}

export async function announceCollection(params: PostToMoltbookParams): Promise<boolean> {
  if (!MINTCLAW_API_KEY) {
    console.log('MINTCLAW_MOLTBOOK_API_KEY not set, skipping Moltbook announcement');
    return false;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mintclaw-production.up.railway.app';
  const collectionUrl = `${siteUrl}/collection/${params.collectionAddress}`;

  // Format price (USDC has 6 decimals)
  const priceDisplay = params.mintPrice === '0'
    ? 'Free mint'
    : `$${(parseFloat(params.mintPrice) / 1e6).toFixed(2)} USDC`;

  // Format supply
  const supplyDisplay = params.maxSupply === 0
    ? 'Unlimited supply'
    : `${params.maxSupply} max supply`;

  // Build the post content
  let content = `New collection launched on MintClaw!\n\n`;
  content += `**${params.collectionName}** (${params.collectionSymbol})\n`;
  content += `${priceDisplay} · ${supplyDisplay}\n\n`;

  if (params.creatorName) {
    content += `Created by @${params.creatorName}\n\n`;
  }

  content += `Mint now: ${collectionUrl}`;

  try {
    const res = await fetch(`${MOLTBOOK_API}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINTCLAW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Failed to post to Moltbook:', error);
      return false;
    }

    console.log('Successfully announced collection on Moltbook');
    return true;
  } catch (error) {
    console.error('Error posting to Moltbook:', error);
    return false;
  }
}
