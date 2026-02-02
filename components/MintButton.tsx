'use client';

import { useState, useEffect } from 'react';
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
} from 'wagmi';
import { injected } from 'wagmi/connectors';
import { type Address } from 'viem';
import { AGENT_NFT_ABI, USDC_ABI, USDC_ADDRESSES, USDC_DECIMALS } from '@/lib/contracts';

interface MintButtonProps {
  collectionAddress: string;
  mintPrice: string; // in USDC smallest unit (6 decimals)
  maxSupply: number;
  totalMinted: number;
  mintingEnabled: boolean;
  onMintSuccess?: () => void;
}

export default function MintButton({
  collectionAddress,
  mintPrice,
  maxSupply,
  totalMinted,
  mintingEnabled,
  onMintSuccess,
}: MintButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const chainId = useChainId();

  const usdcAddress = USDC_ADDRESSES[chainId] as Address;
  const totalCost = BigInt(mintPrice) * BigInt(quantity);
  const formattedPrice = (Number(totalCost) / 10 ** USDC_DECIMALS).toFixed(2);

  // Check USDC allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, collectionAddress as Address] : undefined,
  });

  // Check USDC balance
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const needsApproval = allowance !== undefined && allowance < totalCost;
  const hasInsufficientBalance = usdcBalance !== undefined && usdcBalance < totalCost;

  // Approve USDC
  const {
    data: approveHash,
    writeContract: approve,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({ hash: approveHash });

  // Mint NFT
  const {
    data: mintHash,
    writeContract: mint,
    isPending: isMinting,
    error: mintError,
  } = useWriteContract();

  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } =
    useWaitForTransactionReceipt({ hash: mintHash });

  // Refetch allowance after approval
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Call onMintSuccess callback after successful mint
  useEffect(() => {
    if (isMintSuccess && onMintSuccess) {
      onMintSuccess();
    }
  }, [isMintSuccess, onMintSuccess]);

  const remaining = maxSupply === 0 ? Infinity : maxSupply - totalMinted;
  const isSoldOut = maxSupply > 0 && totalMinted >= maxSupply;
  const isFree = mintPrice === '0';

  const handleApprove = () => {
    approve({
      address: usdcAddress,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [collectionAddress as Address, totalCost],
    });
  };

  const handleMint = () => {
    if (!isConnected) {
      connect({ connector: injected() });
      return;
    }

    mint({
      address: collectionAddress as Address,
      abi: AGENT_NFT_ABI,
      functionName: 'mint',
      args: [BigInt(quantity)],
    });
  };

  const getButtonState = () => {
    if (!isConnected) return { text: 'Connect Wallet', action: handleMint, disabled: false };
    if (!mintingEnabled) return { text: 'Minting Paused', action: () => {}, disabled: true };
    if (isSoldOut) return { text: 'Sold Out', action: () => {}, disabled: true };
    if (hasInsufficientBalance) return { text: 'Insufficient USDC', action: () => {}, disabled: true };

    if (isApproving || isApproveConfirming) {
      return { text: 'Approving USDC...', action: () => {}, disabled: true };
    }

    if (isMinting || isMintConfirming) {
      return { text: 'Minting...', action: () => {}, disabled: true };
    }

    if (isMintSuccess) {
      return { text: 'Minted!', action: () => {}, disabled: true };
    }

    if (!isFree && needsApproval) {
      return { text: `Approve USDC`, action: handleApprove, disabled: false };
    }

    const priceText = isFree ? 'Free' : `$${formattedPrice} USDC`;
    return { text: `Mint ${quantity} for ${priceText}`, action: handleMint, disabled: false };
  };

  const buttonState = getButtonState();

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

      {/* Main button */}
      <button
        onClick={buttonState.action}
        disabled={buttonState.disabled}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
          buttonState.disabled
            ? 'bg-[var(--card-border)] text-[var(--muted)] cursor-not-allowed'
            : isMintSuccess
            ? 'bg-green-600 text-white'
            : 'btn-primary'
        }`}
      >
        {buttonState.text}
      </button>

      {/* Error messages */}
      {(approveError || mintError) && (
        <p className="text-red-500 text-sm">
          {(approveError || mintError)?.message?.includes('User rejected')
            ? 'Transaction cancelled'
            : 'Transaction failed. Please try again.'}
        </p>
      )}

      {/* Success message */}
      {isMintSuccess && mintHash && (
        <p className="text-green-500 text-sm">
          Successfully minted! View on{' '}
          <a
            href={`https://sepolia.basescan.org/tx/${mintHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            BaseScan
          </a>
        </p>
      )}

      {/* USDC Balance info */}
      {isConnected && usdcBalance !== undefined && (
        <div className="text-center text-[var(--muted)] text-sm">
          Your USDC balance: ${(Number(usdcBalance) / 10 ** USDC_DECIMALS).toFixed(2)}
        </div>
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
