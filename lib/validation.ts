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
