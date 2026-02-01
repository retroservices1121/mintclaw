import { PinataSDK } from 'pinata';

let pinataClient: PinataSDK | null = null;

function getPinataClient(): PinataSDK {
  if (!pinataClient) {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      throw new Error('PINATA_JWT environment variable is not set');
    }
    pinataClient = new PinataSDK({ pinataJwt: jwt });
  }
  return pinataClient;
}

export async function uploadFileToIPFS(file: File): Promise<string> {
  const pinata = getPinataClient();

  const upload = await pinata.upload.public.file(file);

  return `ipfs://${upload.cid}`;
}

export async function uploadJsonToIPFS(json: object, name?: string): Promise<string> {
  const pinata = getPinataClient();

  const upload = await pinata.upload.public.json(json);

  return `ipfs://${upload.cid}`;
}

export function ipfsToHttp(ipfsUrl: string): string {
  if (!ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }
  const cid = ipfsUrl.replace('ipfs://', '');
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export function httpToIpfs(httpUrl: string): string {
  // Handle various IPFS gateway formats
  const patterns = [
    /https?:\/\/gateway\.pinata\.cloud\/ipfs\/(.+)/,
    /https?:\/\/ipfs\.io\/ipfs\/(.+)/,
    /https?:\/\/cloudflare-ipfs\.com\/ipfs\/(.+)/,
    /https?:\/\/[^/]+\/ipfs\/(.+)/,
  ];

  for (const pattern of patterns) {
    const match = httpUrl.match(pattern);
    if (match) {
      return `ipfs://${match[1]}`;
    }
  }

  return httpUrl;
}
