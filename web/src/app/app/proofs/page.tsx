'use client';
import { Suspense } from 'react';
import { useSubject } from '@/hooks/useSubject';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useProfile } from '@/hooks/useProfile';
import { FactsTable } from '@/components/FactsTable';
import { Card, Empty } from '@/components/ui';
import { useCc3TxByQuery } from '@/hooks/useCc3Txs';

function Proofs() {
  const { subject: address, isConnected: connected, viewingAs } = useSubject();
  const isConnected = connected || viewingAs;
  const p = useProfile(address);
  const txByQuery = useCc3TxByQuery(address, p.pulse);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-32">
      <h1 className="text-4xl font-semibold">Proofs</h1>
      <p className="mt-2 text-base text-fg-2">Every fact behind your profile: the Sepolia block it was proven from, its Attestcoin query id and the Creditcoin transaction that verified it.</p>
      <div className="mt-10">
        {!isConnected ? (
          <Empty title="Connect to see your proofs"><div className="mt-4 flex justify-center"><ConnectButton /></div></Empty>
        ) : (
          <Card title={`${p.facts.length} fact${p.facts.length === 1 ? '' : 's'}`}>
            <FactsTable facts={p.facts} loading={p.isLoading} cc3TxByQuery={txByQuery} />
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ProofsPage() {
  return (
    <Suspense fallback={null}>
      <Proofs />
    </Suspense>
  );
}
