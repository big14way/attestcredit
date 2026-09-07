'use client';
import { useEffect, useState } from 'react';
import { parseAbiItem, type Address } from 'viem';
import { cc3Client, addresses, isDeployed } from '@/lib/contracts';

const FACT_RECORDED = parseAbiItem(
  'event FactRecorded(address indexed subject, uint8 indexed factType, address reserve, uint256 amount, uint128 amountUsd6, uint64 sourceBlock, bytes32 indexed queryId, bytes32 factId)',
);

/** Creditcoin verification tx per Attestcoin queryId, from CreditBureauASC.FactRecorded logs for one subject. */
export function useCc3TxByQuery(subject?: Address, dep?: unknown): Record<string, string> {
  const [m, setM] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!isDeployed || !subject) return;
    (async () => {
      try {
        const logs = await cc3Client.getLogs({ address: addresses.bureau, event: FACT_RECORDED, args: { subject }, fromBlock: 'earliest' });
        const next: Record<string, string> = {};
        for (const l of logs) if (l.args.queryId) next[l.args.queryId] = l.transactionHash;
        setM(next);
      } catch { /* column stays empty */ }
    })();
  }, [subject, dep]);
  return m;
}
