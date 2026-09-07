'use client';
import { useStats } from '@/hooks/useProfile';
import { isDeployed } from '@/lib/contracts';
import { Stat } from './ui';

export function LiveStats() {
  const s = useStats();
  const v = (x?: bigint) => (isDeployed ? (x === undefined ? '–' : x.toLocaleString()) : 'not deployed');
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Stat label="Subjects with a profile" value={v(s.subjects)} loading={isDeployed && s.isLoading} />
      <Stat label="Facts proven" value={v(s.facts)} loading={isDeployed && s.isLoading} hint="Borrow, Repay, Liquidation and native events" />
      <Stat label="Sepolia txs verified" value={v(s.proofs)} loading={isDeployed && s.isLoading} hint="through the 0xFD2 block prover precompile" />
      <Stat label="Latest attested Sepolia block" value={v(s.attestedBlock)} loading={isDeployed && s.isLoading} hint="read from the ChainInfo precompile" />
    </div>
  );
}
