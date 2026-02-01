import { createWalletClient, createPublicClient, http, parseEther, type Hash, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { FACTORY_ABI, getFactoryAddress } from './contracts';

function getChain(chainId: number) {
  switch (chainId) {
    case 8453:
      return base;
    case 84532:
      return baseSepolia;
    default:
      throw new Error(`Unsupported chain: ${chainId}`);
  }
}

function getRpcUrl(chainId: number): string {
  switch (chainId) {
    case 8453:
      return process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    case 84532:
      return process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    default:
      throw new Error(`Unsupported chain: ${chainId}`);
  }
}

export interface DeployCollectionParams {
  name: string;
  symbol: string;
  baseURI: string;
  maxSupply: number;
  mintPrice: string; // in ETH, e.g., "0.01"
  royaltyBps: number;
  chainId?: number;
}

export interface DeployResult {
  transactionHash: Hash;
  collectionAddress: Address;
}

export async function deployCollection(params: DeployCollectionParams): Promise<DeployResult> {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY not configured');
  }

  const chainId = params.chainId || 8453;
  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);
  const factoryAddress = getFactoryAddress(chainId) as Address;

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  // Call createCollection on factory
  const hash = await walletClient.writeContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'createCollection',
    args: [
      params.name,
      params.symbol,
      params.baseURI,
      BigInt(params.maxSupply),
      parseEther(params.mintPrice),
      BigInt(params.royaltyBps),
    ],
  });

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract collection address from CollectionCreated event
  const collectionCreatedEvent = receipt.logs.find((log) => {
    // CollectionCreated event topic
    return log.topics[0] === '0x2d49c67975aadd2d389580b368cfff5b49965b0bd5da33c144922ce01e7a4d7b';
  });

  if (!collectionCreatedEvent || !collectionCreatedEvent.topics[1]) {
    throw new Error('CollectionCreated event not found in transaction');
  }

  // The collection address is the first indexed parameter (topics[1])
  const collectionAddress = `0x${collectionCreatedEvent.topics[1].slice(26)}` as Address;

  return {
    transactionHash: hash,
    collectionAddress,
  };
}

export async function verifyFactoryDeployment(
  collectionAddress: Address,
  chainId: number = 8453
): Promise<boolean> {
  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);
  const factoryAddress = getFactoryAddress(chainId) as Address;

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  try {
    const isDeployed = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: 'isDeployedCollection',
      args: [collectionAddress],
    });

    return isDeployed;
  } catch (error) {
    console.error('Error verifying factory deployment:', error);
    return false;
  }
}
