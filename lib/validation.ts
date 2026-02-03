import { z } from 'zod';

const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

const transactionHash = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

export const launchCollectionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be 10 characters or less')
    .regex(/^[A-Z0-9]+$/, 'Symbol must be uppercase alphanumeric'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  baseUri: z.string().url('Invalid base URI'),
  maxSupply: z.number().int().min(0, 'Max supply must be 0 or greater').default(0),
  mintPrice: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Mint price must be a valid number')
    .default('0'),
  royaltyBps: z
    .number()
    .int()
    .min(0, 'Royalty must be 0 or greater')
    .max(1000, 'Royalty cannot exceed 10%')
    .default(500),
  creatorWallet: ethereumAddress,
  paymentTxHash: transactionHash,
  chainId: z.number().int().optional(),
});

export const registerCollectionSchema = z.object({
  address: ethereumAddress,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be 10 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  baseUri: z.string().url('Invalid base URI'),
  maxSupply: z.number().int().min(0).default(0),
  mintPrice: z.string().default('0'),
  royaltyBps: z.number().int().min(0).max(1000).default(500),
  creatorWallet: ethereumAddress,
  transactionHash: transactionHash,
  chainId: z.number().int().optional(),
});

export const uploadSchema = z.object({
  file: z.instanceof(File),
});

export type LaunchCollectionInput = z.infer<typeof launchCollectionSchema>;
export type RegisterCollectionInput = z.infer<typeof registerCollectionSchema>;

// ============ PAYMENT SCHEMAS ============

export const instantPaySchema = z.object({
  to: ethereumAddress,
  amount: z.string().regex(/^\d+$/, 'Amount must be a positive integer string (USDC smallest unit)'),
  memo: z.string().max(256, 'Memo must be 256 characters or less').optional(),
  chainId: z.number().int().optional(),
});

export const createEscrowSchema = z.object({
  provider: ethereumAddress,
  amount: z.string().regex(/^\d+$/, 'Amount must be a positive integer string (USDC smallest unit)'),
  jobId: z.string().min(1, 'Job ID is required').max(100, 'Job ID must be 100 characters or less'),
  deadline: z.number().int().positive('Deadline must be a positive timestamp'),
  chainId: z.number().int().optional(),
});

export const escrowActionSchema = z.object({
  escrowId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid escrow ID'),
  chainId: z.number().int().optional(),
});

export const startStreamSchema = z.object({
  recipient: ethereumAddress,
  ratePerSecond: z.string().regex(/^\d+$/, 'Rate must be a positive integer string (USDC smallest unit per second)'),
  maxDuration: z.number().int().positive('Max duration must be positive (in seconds)'),
  chainId: z.number().int().optional(),
});

export const streamActionSchema = z.object({
  streamId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid stream ID'),
  chainId: z.number().int().optional(),
});

export type InstantPayInput = z.infer<typeof instantPaySchema>;
export type CreateEscrowInput = z.infer<typeof createEscrowSchema>;
export type EscrowActionInput = z.infer<typeof escrowActionSchema>;
export type StartStreamInput = z.infer<typeof startStreamSchema>;
export type StreamActionInput = z.infer<typeof streamActionSchema>;
