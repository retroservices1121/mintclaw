import { createPublicClient, http, type Hash, type Address, formatEther } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import prisma from './db';

const PLATFORM_PAYMENT_ADDRESS = process.env.PLATFORM_PAYMENT_ADDRESS as Address;
const LAUNCH_FEE_USD = parseFloat(process.env.LAUNCH_FEE_USD || '2');

// Simplified: Using a fixed ETH price for now
// In production, you'd want to use a price feed (Chainlink, etc.)
const ETH_PRICE_USD = 2500; // Approximate ETH price

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

export interface PaymentVerificationResult {
  valid: boolean;
  error?: string;
  ethAmount?: string;
  usdValue?: number;
}

export async function verifyPayment(
  txHash: Hash,
  chainId: number = 8453
): Promise<PaymentVerificationResult> {
  if (!PLATFORM_PAYMENT_ADDRESS) {
    return { valid: false, error: 'Platform payment address not configured' };
  }

  const chain = getChain(chainId);
  const rpcUrl = getRpcUrl(chainId);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  try {
    // Check if tx hash has already been used
    const existingTx = await prisma.usedPaymentTx.findUnique({
      where: { txHash },
    });

    if (existingTx) {
      return { valid: false, error: 'Payment transaction already used' };
    }

    // Fetch the transaction
    const tx = await publicClient.getTransaction({ hash: txHash });

    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    // Check recipient
    if (tx.to?.toLowerCase() !== PLATFORM_PAYMENT_ADDRESS.toLowerCase()) {
      return {
        valid: false,
        error: `Payment must be sent to ${PLATFORM_PAYMENT_ADDRESS}`,
      };
    }

    // Check confirmation
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (!receipt || receipt.status !== 'success') {
      return { valid: false, error: 'Transaction not confirmed or failed' };
    }

    // Check amount
    const ethAmount = formatEther(tx.value);
    const usdValue = parseFloat(ethAmount) * ETH_PRICE_USD;

    if (usdValue < LAUNCH_FEE_USD) {
      return {
        valid: false,
        error: `Insufficient payment. Sent ~$${usdValue.toFixed(2)}, required $${LAUNCH_FEE_USD}`,
        ethAmount,
        usdValue,
      };
    }

    // Mark transaction as used
    await prisma.usedPaymentTx.create({
      data: { txHash },
    });

    return {
      valid: true,
      ethAmount,
      usdValue,
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function calculateRequiredEth(): string {
  const ethRequired = LAUNCH_FEE_USD / ETH_PRICE_USD;
  // Add 10% buffer for price fluctuations
  const withBuffer = ethRequired * 1.1;
  return withBuffer.toFixed(6);
}
