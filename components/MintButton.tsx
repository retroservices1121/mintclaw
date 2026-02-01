'use client';

import { useState } from 'react';
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseEther, formatEther, type Address } from 'viem';
import { AGENT_NFT_ABI } from '@/lib/contracts';

interface MintButtonProps {
  collectionAddress: string;
  mintPrice: string;
  maxSupply: number;
  totalMinted: number;
  mintingEnabled: boolean;
}

export default function MintButton({
  collectionAddress,
  mintPrice,
  maxSupply,
  totalMinted,
  mintingEnabled,
}: MintButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();

  const { data: hash, writeContract, isPending: isWriting, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const totalPrice = BigInt(mintPrice) * BigInt(quantity);
  const formattedPrice = formatEther(totalPrice);
  const remaining = maxSupply === 0 ? Infinity : maxSupply - totalMinted;
  const isSoldOut = maxSupply > 0 && totalMinted >= maxSupply;

  const handleMint = async () => {
    if (!isConnected) {
      connect({ connector: injected() });
      return;
    }

    writeContract({
      address: collectionAddress as Address,
      abi: AGENT_NFT_ABI,
      functionName: 'mint',
      args: [BigInt(quantity)],
      value: totalPrice,
    });
  };

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet';
    if (!mintingEnabled) return 'Minting Paused';
    if (isSoldOut) return 'Sold Out';
    if (isWriting) return 'Confirm in Wallet...';
    if (isConfirming) return 'Minting...';
    if (isSuccess) return 'Minted!';
    return `Mint ${quantity} for ${formattedPrice} ETH`;
  };

  const isDisabled =
    (isConnected && !mintingEnabled) ||
    isSoldOut ||
    isWriting ||
    isConfirming;

  return (
    <div className="space-y-4">
      {/* Quantity selector */}
      {isConnected && mintingEnabled && !isSoldOut && (
        <div className="flex items-center gap-4">
          <label className="text-[var(--muted)]">Quantity:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 bg-[var(--card-border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
              disabled={quantity <= 1}
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(
                      parseInt(e.target.value) || 1,
                      maxSupply === 0 ? 100 : remaining
                    )
                  )
                )
              }
              className="w-16 h-10 text-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg"
              min={1}
              max={maxSupply === 0 ? 100 : remaining}
            />
            <button
              onClick={() =>
                setQuantity(
                  Math.min(quantity + 1, maxSupply === 0 ? 100 : remaining)
                )
              }
              className="w-10 h-10 bg-[var(--card-border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
              disabled={maxSupply > 0 && quantity >= remaining}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Mint button */}
      <button
        onClick={handleMint}
        disabled={isDisabled}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
          isDisabled
            ? 'bg-[var(--card-border)] text-[var(--muted)] cursor-not-allowed'
            : isSuccess
            ? 'bg-green-600 text-white'
            : 'btn-primary'
        }`}
      >
        {getButtonText()}
      </button>

      {/* Error message */}
      {writeError && (
        <p className="text-red-500 text-sm">
          {writeError.message.includes('User rejected')
            ? 'Transaction cancelled'
            : 'Mint failed. Please try again.'}
        </p>
      )}

      {/* Success message */}
      {isSuccess && hash && (
        <p className="text-green-500 text-sm">
          Successfully minted! View on{' '}
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            BaseScan
          </a>
        </p>
      )}

      {/* Supply info */}
      {maxSupply > 0 && (
        <div className="text-center text-[var(--muted)] text-sm">
          {totalMinted.toLocaleString()} / {maxSupply.toLocaleString()} minted
          {remaining > 0 && remaining < 100 && (
            <span className="text-[var(--accent)]"> ({remaining} left)</span>
          )}
        </div>
      )}
    </div>
  );
}
