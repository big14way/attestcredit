'use client';
import { use } from 'react';
import { isAddress, type Address } from 'viem';
import { useProfile } from '@/hooks/useProfile';
import { ScoreGauge } from '@/components/ScoreGauge';
import { BreakdownTable } from '@/components/Breakdown';
import { FactsTable } from '@/components/FactsTable';
import { PassportCard } from '@/components/PassportCard';
import { Card, Empty, HashLink } from '@/components/ui';
import { explorer } from '@/lib/chains';
import { usd6, tierName } from '@/lib/format';
import { addresses } from '@/lib/contracts';

export default function Lookup({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const valid = isAddress(address);
  const p = useProfile(valid ? (address as Address) : undefined);
  if (!valid) return <div className="mx-auto max-w-3xl px-6 pt-32"><Empty title="Not an address"><p>{address}</p></Empty></div>;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-32">
      <p className="text-sm text-fg-2">Bureau view · what a lender sees</p>
      <h1 className="mt-1 break-all font-mono text-2xl font-semibold md:text-3xl">{address}</h1>
      <p className="mt-2 text-sm text-fg-2">
        <HashLink href={explorer.sepoliaAddress(address)} label="Sepolia" mono={false} /> · <HashLink href={explorer.cc3Address(address)} label="Creditcoin" mono={false} /> · ledger <HashLink href={explorer.cc3Address(addresses.ledger)} label={addresses.ledger.slice(0, 10) + '…'} />
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card title="Score">
          <ScoreGauge score={p.score} tier={p.tier} pulse={p.pulse} />
          {p.profile && (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Borrows</dt><dd className="font-mono text-lg">{p.profile.borrowCount}</dd></div>
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Repays</dt><dd className="font-mono text-lg">{p.profile.repayCount}</dd></div>
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Borrowed</dt><dd className="font-mono text-lg">{usd6(p.profile.borrowedVolumeUsd6)}</dd></div>
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Repaid</dt><dd className="font-mono text-lg">{usd6(p.profile.repaidVolumeUsd6)}</dd></div>
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Liquidations</dt><dd className="font-mono text-lg">{p.profile.liquidationCount}</dd></div>
              <div className="rounded-lg bg-raised p-3"><dt className="text-fg-3">Native repays</dt><dd className="font-mono text-lg">{p.profile.nativeRepayCount}</dd></div>
            </dl>
          )}
        </Card>
        <Card title="Why">
          <BreakdownTable b={p.breakdown} loading={p.isLoading} />
        </Card>
        <Card title="Passport">
          <PassportCard subject={address as Address} hasPassport={p.hasPassport} canMint={p.facts.length > 0} />
        </Card>
        <Card className="lg:col-span-3" title={`Facts (${p.facts.length})`}>
          <FactsTable facts={p.facts} loading={p.isLoading} />
        </Card>
      </div>
      {p.tier !== undefined && (
        <p className="mt-6 text-sm text-fg-2">A TieredLender integration would offer this address <span className="font-semibold text-fg">{tierName(p.tier)}</span> terms right now.</p>
      )}
    </div>
  );
}
