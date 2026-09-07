'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseAbiItem } from 'viem';
import { useProfile } from '@/hooks/useProfile';
import { FactsTable } from '@/components/FactsTable';
import { Card, Empty } from '@/components/ui';
import { cc3Client, addresses, isDeployed } from '@/lib/contracts';

export default function Proofs() {
  const { address, isConnected } = useAccount();
  const p = useProfile(address);
  const [txByQuery, setTxByQuery] = useState<Record<string, string>>({});

  // Creditcoin verification tx per queryId, from the bureau's QueryVerified logs.
  useEffect(() => {
    if (!isDeployed || !address) return;
    (async () => {
      try {
        const logs = await cc3Client.getLogs({
          address: addresses.bureau,
          event: parseAbiItem('event FactRecorded(address indexed subject, uint8 indexed factType, address reserve, uint256 amount, uint128 amountUsd6, uint64 sourceBlock, bytes32 indexed queryId, bytes32 factId)'),
          args: { subject: address },
          fromBlock: 'earliest',
        });
        const m: Record<string, string> = {};
        for (const l of logs) if (l.args.queryId) m[l.args.queryId] = l.transactionHash;
        setTxByQuery(m);
      } catch { /* explorer link column stays empty */ }
    })();
  }, [address, p.pulse]);

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
