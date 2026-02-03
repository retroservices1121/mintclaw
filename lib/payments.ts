import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import { CHAINS, PAYMENTS_ADDRESSES, USDC_ADDRESSES } from './constants';

// MintClawPayments ABI (subset for API operations)
export const PAYMENTS_ABI = parseAbi([
  // Instant Pay
  'function pay(address to, uint256 amount, string memo) external',

  // Escrow
  'function createEscrow(address provider, uint256 amount, string jobId, uint256 deadline) external returns (bytes32)',
  'function releaseEscrow(bytes32 escrowId) external',
  'function claimEscrow(bytes32 escrowId) external',
  'function refundEscrow(bytes32 escrowId) external',
  'function cancelEscrow(bytes32 escrowId) external',
  'function getEscrow(bytes32 escrowId) external view returns (address payer, address provider, uint256 amount, uint256 deadline, string jobId, uint8 state)',

  // Streams
  'function startStream(address recipient, uint256 ratePerSecond, uint256 maxDuration) external returns (bytes32)',
  'function withdrawFromStream(bytes32 streamId) external',
  'function stopStream(bytes32 streamId) external',
  'function getStreamBalance(bytes32 streamId) external view returns (uint256)',
  'function getStream(bytes32 streamId) external view returns (address payer, address recipient, uint256 ratePerSecond, uint256 startTime, uint256 maxDuration, uint256 withdrawn, bool active)',

  // Events
  'event InstantPayment(address indexed from, address indexed to, uint256 amount, uint256 fee, string memo)',
  'event EscrowCreated(bytes32 indexed escrowId, address indexed payer, address indexed provider, uint256 amount, string jobId, uint256 deadline)',
  'event EscrowReleased(bytes32 indexed escrowId, uint256 amount, uint256 fee)',
  'event EscrowRefunded(bytes32 indexed escrowId, uint256 amount)',
  'event StreamStarted(bytes32 indexed streamId, address indexed payer, address indexed recipient, uint256 ratePerSecond, uint256 maxDuration)',
  'event StreamWithdrawn(bytes32 indexed streamId, uint256 amount)',
  'event StreamStopped(bytes32 indexed streamId, uint256 totalPaid, uint256 refunded)',
]);

// USDC ABI
export const USDC_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
]);

// Escrow states
export enum EscrowState {
  None = 0,
  Active = 1,
  Released = 2,
  Disputed = 3,
  Refunded = 4,
}

export const ESCROW_STATE_NAMES: Record<number, string> = {
  0: 'none',
  1: 'active',
  2: 'released',
  3: 'disputed',
  4: 'refunded',
};

function getChain(chainId: number) {
  return chainId === CHAINS.BASE_MAINNET ? base : baseSepolia;
}

function getRpcUrl(chainId: number) {
  return chainId === CHAINS.BASE_MAINNET
    ? process.env.BASE_RPC_URL || 'https://mainnet.base.org'
    : process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
}

export function getPublicClient(chainId: number) {
  return createPublicClient({
    chain: getChain(chainId),
    transport: http(getRpcUrl(chainId)),
  });
}

export function getWalletClient(chainId: number) {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY not set');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  return createWalletClient({
    account,
    chain: getChain(chainId),
    transport: http(getRpcUrl(chainId)),
  });
}

export function getPaymentsAddress(chainId: number): `0x${string}` {
  const address = PAYMENTS_ADDRESSES[chainId];
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Payments contract not deployed on chain ${chainId}`);
  }
  return address;
}

export function getUsdcAddress(chainId: number): `0x${string}` {
  const address = USDC_ADDRESSES[chainId];
  if (!address) {
    throw new Error(`USDC not configured for chain ${chainId}`);
  }
  return address;
}

// Read functions
export async function getEscrow(escrowId: `0x${string}`, chainId: number) {
  const client = getPublicClient(chainId);
  const paymentsAddress = getPaymentsAddress(chainId);

  const result = await client.readContract({
    address: paymentsAddress,
    abi: PAYMENTS_ABI,
    functionName: 'getEscrow',
    args: [escrowId],
  });

  const [payer, provider, amount, deadline, jobId, state] = result as [string, string, bigint, bigint, string, number];

  return {
    escrowId,
    payer,
    provider,
    amount: amount.toString(),
    deadline: Number(deadline),
    jobId,
    state: ESCROW_STATE_NAMES[state] || 'unknown',
    stateCode: state,
  };
}

export async function getStream(streamId: `0x${string}`, chainId: number) {
  const client = getPublicClient(chainId);
  const paymentsAddress = getPaymentsAddress(chainId);

  const [streamData, withdrawable] = await Promise.all([
    client.readContract({
      address: paymentsAddress,
      abi: PAYMENTS_ABI,
      functionName: 'getStream',
      args: [streamId],
    }),
    client.readContract({
      address: paymentsAddress,
      abi: PAYMENTS_ABI,
      functionName: 'getStreamBalance',
      args: [streamId],
    }),
  ]);

  const [payer, recipient, ratePerSecond, startTime, maxDuration, withdrawn, active] = streamData as [string, string, bigint, bigint, bigint, bigint, boolean];

  return {
    streamId,
    payer,
    recipient,
    ratePerSecond: ratePerSecond.toString(),
    startTime: Number(startTime),
    maxDuration: Number(maxDuration),
    withdrawn: withdrawn.toString(),
    withdrawable: (withdrawable as bigint).toString(),
    active,
    totalDeposit: (ratePerSecond * maxDuration).toString(),
  };
}

export async function getUsdcBalance(address: `0x${string}`, chainId: number) {
  const client = getPublicClient(chainId);
  const usdcAddress = getUsdcAddress(chainId);

  const balance = await client.readContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  return (balance as bigint).toString();
}

export async function getUsdcAllowance(owner: `0x${string}`, spender: `0x${string}`, chainId: number) {
  const client = getPublicClient(chainId);
  const usdcAddress = getUsdcAddress(chainId);

  const allowance = await client.readContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  });

  return (allowance as bigint).toString();
}
