import { PrivyClient } from '@privy-io/node';
import { encodeFunctionData, parseAbi } from 'viem';
import { PAYMENTS_ADDRESSES, USDC_ADDRESSES, CHAINS } from './constants';
import { PAYMENTS_ABI } from './payments';

// Initialize Privy client
const getPrivyClient = () => {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET environment variables required');
  }

  return new PrivyClient({ appId, appSecret });
};

// USDC ABI for approvals
const USDC_ABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

// Chain ID to CAIP-2 identifier mapping
const CAIP2_IDENTIFIERS: Record<number, string> = {
  [CHAINS.BASE_SEPOLIA]: 'eip155:84532',
  [CHAINS.MONAD_TESTNET]: 'eip155:10143',
  [CHAINS.BASE_MAINNET]: 'eip155:8453',
};

export interface CreateWalletOptions {
  /** Optional policy constraints */
  policy?: {
    /** Max USDC per transaction (6 decimals) */
    maxTransactionValue?: string;
    /** Daily spending limit in USDC (6 decimals) */
    dailyLimit?: string;
    /** Restrict to specific chain IDs */
    allowedChainIds?: number[];
  };
}

export interface WalletInfo {
  id: string;
  address: string;
  chainType: string;
}

export interface TransactionResult {
  hash: string;
  chainId: number;
}

/**
 * Create a new agent wallet with MintClaw-specific policy
 */
export async function createAgentWallet(options: CreateWalletOptions = {}): Promise<WalletInfo> {
  const privy = getPrivyClient();

  const wallet = await privy.wallets().create({
    chain_type: 'ethereum',
  });

  return {
    id: wallet.id,
    address: wallet.address,
    chainType: 'ethereum',
  };
}

/**
 * Get wallet by ID
 */
export async function getWallet(walletId: string): Promise<WalletInfo> {
  const privy = getPrivyClient();
  const wallet = await privy.wallets().get(walletId);

  return {
    id: wallet.id,
    address: wallet.address,
    chainType: 'ethereum',
  };
}

/**
 * Execute a raw transaction via Privy wallet
 */
export async function executeTransaction(
  walletId: string,
  chainId: number,
  to: string,
  data: string,
  value?: string
): Promise<TransactionResult> {
  const privy = getPrivyClient();
  const caip2 = CAIP2_IDENTIFIERS[chainId];

  if (!caip2) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const result = await privy.wallets().ethereum().sendTransaction(walletId, {
    caip2,
    params: {
      transaction: {
        to,
        data,
        value: value ? value : undefined,
      },
    },
  });

  return {
    hash: result.hash,
    chainId,
  };
}

// ============================================
// MintClaw Payment Helpers
// ============================================

/**
 * Approve USDC spending for MintClaw payments contract
 */
export async function approveUSDC(
  walletId: string,
  chainId: number,
  amount: string
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];
  const usdcAddress = USDC_ADDRESSES[chainId];

  if (!paymentsAddress || !usdcAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: USDC_ABI,
    functionName: 'approve',
    args: [paymentsAddress, BigInt(amount)],
  });

  return executeTransaction(walletId, chainId, usdcAddress, data);
}

/**
 * Send instant USDC payment via MintClaw
 */
export async function sendPayment(
  walletId: string,
  chainId: number,
  to: string,
  amount: string,
  memo: string = ''
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];

  if (!paymentsAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: PAYMENTS_ABI,
    functionName: 'pay',
    args: [to as `0x${string}`, BigInt(amount), memo],
  });

  return executeTransaction(walletId, chainId, paymentsAddress, data);
}

/**
 * Create an escrow for a job
 */
export async function createEscrow(
  walletId: string,
  chainId: number,
  provider: string,
  amount: string,
  jobId: string,
  deadline: number
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];

  if (!paymentsAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: PAYMENTS_ABI,
    functionName: 'createEscrow',
    args: [provider as `0x${string}`, BigInt(amount), jobId, BigInt(deadline)],
  });

  return executeTransaction(walletId, chainId, paymentsAddress, data);
}

/**
 * Release escrow funds to provider
 */
export async function releaseEscrow(
  walletId: string,
  chainId: number,
  escrowId: string
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];

  if (!paymentsAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: PAYMENTS_ABI,
    functionName: 'releaseEscrow',
    args: [escrowId as `0x${string}`],
  });

  return executeTransaction(walletId, chainId, paymentsAddress, data);
}

/**
 * Claim escrow after deadline (for providers)
 */
export async function claimEscrow(
  walletId: string,
  chainId: number,
  escrowId: string
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];

  if (!paymentsAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: PAYMENTS_ABI,
    functionName: 'claimEscrow',
    args: [escrowId as `0x${string}`],
  });

  return executeTransaction(walletId, chainId, paymentsAddress, data);
}

/**
 * Refund escrow (for providers who can't complete)
 */
export async function refundEscrow(
  walletId: string,
  chainId: number,
  escrowId: string
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];

  if (!paymentsAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: PAYMENTS_ABI,
    functionName: 'refundEscrow',
    args: [escrowId as `0x${string}`],
  });

  return executeTransaction(walletId, chainId, paymentsAddress, data);
}

/**
 * Start a payment stream
 */
export async function startStream(
  walletId: string,
  chainId: number,
  recipient: string,
  ratePerSecond: string,
  maxDuration: number
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];

  if (!paymentsAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: PAYMENTS_ABI,
    functionName: 'startStream',
    args: [recipient as `0x${string}`, BigInt(ratePerSecond), BigInt(maxDuration)],
  });

  return executeTransaction(walletId, chainId, paymentsAddress, data);
}

/**
 * Withdraw from a stream (for recipients)
 */
export async function withdrawFromStream(
  walletId: string,
  chainId: number,
  streamId: string
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];

  if (!paymentsAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: PAYMENTS_ABI,
    functionName: 'withdrawFromStream',
    args: [streamId as `0x${string}`],
  });

  return executeTransaction(walletId, chainId, paymentsAddress, data);
}

/**
 * Stop a stream (either party)
 */
export async function stopStream(
  walletId: string,
  chainId: number,
  streamId: string
): Promise<TransactionResult> {
  const paymentsAddress = PAYMENTS_ADDRESSES[chainId];

  if (!paymentsAddress) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  const data = encodeFunctionData({
    abi: PAYMENTS_ABI,
    functionName: 'stopStream',
    args: [streamId as `0x${string}`],
  });

  return executeTransaction(walletId, chainId, paymentsAddress, data);
}

// ============================================
// Convenience: Approve + Action in sequence
// ============================================

/**
 * Approve USDC and send payment in one call
 * Note: These are two separate transactions
 */
export async function approveAndPay(
  walletId: string,
  chainId: number,
  to: string,
  amount: string,
  memo: string = ''
): Promise<{ approveTx: TransactionResult; payTx: TransactionResult }> {
  // First approve
  const approveTx = await approveUSDC(walletId, chainId, amount);

  // Then pay
  const payTx = await sendPayment(walletId, chainId, to, amount, memo);

  return {
    approveTx,
    payTx,
  };
}

/**
 * Approve USDC and create escrow in one call
 */
export async function approveAndCreateEscrow(
  walletId: string,
  chainId: number,
  provider: string,
  amount: string,
  jobId: string,
  deadline: number
): Promise<{ approveTx: TransactionResult; escrowTx: TransactionResult }> {
  const approveTx = await approveUSDC(walletId, chainId, amount);
  const escrowTx = await createEscrow(walletId, chainId, provider, amount, jobId, deadline);

  return {
    approveTx,
    escrowTx,
  };
}

/**
 * Approve USDC and start stream in one call
 */
export async function approveAndStartStream(
  walletId: string,
  chainId: number,
  recipient: string,
  ratePerSecond: string,
  maxDuration: number
): Promise<{ approveTx: TransactionResult; streamTx: TransactionResult }> {
  const totalDeposit = BigInt(ratePerSecond) * BigInt(maxDuration);
  const approveTx = await approveUSDC(walletId, chainId, totalDeposit.toString());
  const streamTx = await startStream(walletId, chainId, recipient, ratePerSecond, maxDuration);

  return {
    approveTx,
    streamTx,
  };
}
