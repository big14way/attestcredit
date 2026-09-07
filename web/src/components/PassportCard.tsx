'use client';
import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';
import { contracts, addresses } from '@/lib/contracts';
import { explorer } from '@/lib/chains';
import { Button, HashLink } from './ui';

/** Renders the on chain SVG from CreditPassport.tokenURI. Mint is subject only; refresh is open to anyone. */
export function PassportCard({ subject, hasPassport, canMint, onChanged }: { subject: Address; hasPassport?: boolean; canMint: boolean; onChanged?: () => void }) {
  const { address } = useAccount();
  const tokenId = BigInt(subject);
  const uri = useReadContract({ ...contracts.passport, functionName: 'tokenURI', args: [tokenId], query: { enabled: Boolean(hasPassport) } });
  const [meta, setMeta] = useState<{ image: string; name: string } | null>(null);
  useEffect(() => {
    if (!uri.data) return setMeta(null);
    try {
      const json = JSON.parse(atob((uri.data as string).split(',')[1]));
      setMeta({ image: json.image, name: json.name });
    } catch {
      setMeta(null);
    }
  }, [uri.data]);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (receipt.isSuccess) { uri.refetch(); onChanged?.(); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const isSelf = address?.toLowerCase() === subject.toLowerCase();

  return (
    <div>
      {hasPassport && meta ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meta.image} alt={`${meta.name}: on chain credit passport SVG`} className="w-full rounded-xl border border-line" />
      ) : hasPassport ? (
        <div className="skeleton aspect-[420/260] w-full" />
      ) : (
        <div className="flex aspect-[420/260] w-full flex-col items-center justify-center rounded-xl border border-dashed border-line bg-raised p-6 text-center">
          <p className="text-base font-semibold">No passport yet</p>
          <p className="mt-1 text-sm text-fg-2">{canMint ? 'Mint a soulbound passport for this address. Only the subject can.' : 'Import at least one proven fact first.'}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!hasPassport && isSelf && (
          <Button onClick={() => writeContract({ ...contracts.passport, functionName: 'mint' })} disabled={!canMint || isPending || receipt.isLoading}>
            {isPending || receipt.isLoading ? 'Minting…' : 'Mint passport'}
          </Button>
        )}
        {hasPassport && (
          <>
            <Button variant="secondary" onClick={() => writeContract({ ...contracts.passport, functionName: 'refresh', args: [subject] })} disabled={isPending || receipt.isLoading}>
              {isPending || receipt.isLoading ? 'Refreshing…' : 'Refresh passport'}
            </Button>
            <HashLink href={explorer.cc3Token(addresses.passport, tokenId.toString())} label={`token #${tokenId.toString().slice(0, 8)}…`} mono={false} />
          </>
        )}
        {txHash && <HashLink href={explorer.cc3Tx(txHash)} label={`tx ${txHash.slice(0, 10)}…`} />}
        {error && <p className="text-sm text-bronze">{(error as Error & { shortMessage?: string }).shortMessage ?? error.message}</p>}
      </div>
    </div>
  );
}
