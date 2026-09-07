'use client';
import { useEffect, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { type Address } from 'viem';
import { cc3Client, contracts, isDeployed } from '@/lib/contracts';

export interface Breakdown {
  base: number; repayPts: number; volumePts: number; ratioPts: number; tenurePts: number; recencyPts: number;
  nativePts: number; liquidationPenalty: number; defaultPenalty: number; score: number; tier: number;
}
export interface Profile {
  borrowCount: number; repayCount: number; liquidationCount: number; borrowedVolumeUsd6: bigint; repaidVolumeUsd6: bigint;
  firstActivityBlock: bigint; lastRepayBlock: bigint; lastLiquidationBlock: bigint; nativeRepayCount: number; nativeDefaultCount: number; updatedAt: bigint;
}
export interface Fact {
  subject: Address; factType: number; reserve: Address; amountRaw: bigint; amountUsd6: bigint; sourceBlock: bigint; queryId: `0x${string}`; recordedAt: bigint;
}

export function useProfile(subject?: Address) {
  const enabled = Boolean(subject) && isDeployed;
  const q = useReadContracts({
    contracts: subject
      ? [
          { ...contracts.ledger, functionName: 'getScore', args: [subject] },
          { ...contracts.ledger, functionName: 'getProfile', args: [subject] },
          { ...contracts.ledger, functionName: 'getBreakdown', args: [subject] },
          { ...contracts.ledger, functionName: 'getFacts', args: [subject] },
          { ...contracts.passport, functionName: 'hasPassport', args: [subject] },
          { ...contracts.ledger, functionName: 'currentSourceBlock' },
        ]
      : [],
    query: { enabled, refetchInterval: 15_000 },
  });
  const [score, tier] = (q.data?.[0]?.result as [number, number] | undefined) ?? [undefined, undefined];
  const profile = q.data?.[1]?.result as Profile | undefined;
  const breakdown = q.data?.[2]?.result as Breakdown | undefined;
  const facts = (q.data?.[3]?.result as Fact[] | undefined) ?? [];
  const hasPassport = q.data?.[4]?.result as boolean | undefined;
  const nowBlock = q.data?.[5]?.result as bigint | undefined;

  // Live: the moment a proof verifies (FactRecorded) or a profile changes (ProfileUpdated), refetch.
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (!subject || !isDeployed) return;
    const unwatchProfile = cc3Client.watchContractEvent({
      ...contracts.ledger,
      eventName: 'ProfileUpdated',
      args: { subject },
      onLogs: () => { setPulse((p) => p + 1); q.refetch(); },
      pollingInterval: 4_000,
    });
    const unwatchFact = cc3Client.watchContractEvent({
      ...contracts.bureau,
      eventName: 'FactRecorded',
      args: { subject },
      onLogs: () => { setPulse((p) => p + 1); q.refetch(); },
      pollingInterval: 4_000,
    });
    return () => { unwatchProfile(); unwatchFact(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  return { score, tier, profile, breakdown, facts, hasPassport, nowBlock, pulse, isLoading: q.isLoading, refetch: q.refetch, enabled };
}

export function useStats() {
  const q = useReadContracts({
    contracts: [
      { ...contracts.ledger, functionName: 'totalSubjects' },
      { ...contracts.ledger, functionName: 'totalFacts' },
      { ...contracts.bureau, functionName: 'verifiedQueryCount' },
      { ...contracts.passport, functionName: 'totalMinted' },
      { ...contracts.ledger, functionName: 'currentSourceBlock' },
    ],
    query: { enabled: isDeployed, refetchInterval: 20_000 },
  });
  const n = (i: number) => (q.data?.[i]?.result as bigint | undefined);
  return { subjects: n(0), facts: n(1), proofs: n(2), passports: n(3), attestedBlock: n(4), isLoading: q.isLoading };
}
