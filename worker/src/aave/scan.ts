import { ethers } from 'ethers';
import { AAVE, EVENT_SIGS, EventName, sepolia } from '../config.js';

export interface QualifyingTx {
  txHash: string;
  block: number;
  events: EventName[];
}

const RANGE = 5000; // publicnode caps eth_getLogs ranges; keep chunks modest

function topicFor(address: string): string {
  return ethers.zeroPadValue(ethers.getAddress(address), 32);
}

/**
 * Find every Aave V3 Pool tx on Sepolia in which `subject` is the credit subject:
 * Borrow (topic2 = onBehalfOf), Repay (topic2 = user), LiquidationCall (topic3 = user).
 * Deduped by tx hash, sorted by block.
 */
export async function scanSubject(
  subject: string,
  fromBlock?: number,
  toBlock?: number,
  onProgress?: (from: number, to: number) => void,
): Promise<QualifyingTx[]> {
  const head = toBlock ?? (await sepolia.getBlockNumber());
  // Aave V3 Sepolia (pool 0x6Ae4…) was deployed around block 5,000,000; default scan window = last ~2M blocks
  const start = fromBlock ?? Math.max(5_000_000, head - 2_000_000);
  const t = topicFor(subject);
  const filters: Array<{ name: EventName; topics: (string | null)[] }> = [
    { name: 'Borrow', topics: [EVENT_SIGS.Borrow, null, t] },
    { name: 'Repay', topics: [EVENT_SIGS.Repay, null, t] },
    { name: 'LiquidationCall', topics: [EVENT_SIGS.LiquidationCall, null, null, t] },
  ];
  const found = new Map<string, QualifyingTx>();
  for (let from = start; from <= head; from += RANGE) {
    const to = Math.min(from + RANGE - 1, head);
    onProgress?.(from, to);
    for (const f of filters) {
      const logs = await withRetry(() =>
        sepolia.getLogs({ address: AAVE.POOL, topics: f.topics, fromBlock: from, toBlock: to }),
      );
      for (const l of logs) {
        const e = found.get(l.transactionHash) ?? { txHash: l.transactionHash, block: l.blockNumber, events: [] };
        if (!e.events.includes(f.name)) e.events.push(f.name);
        found.set(l.transactionHash, e);
      }
    }
  }
  return [...found.values()].sort((a, b) => a.block - b.block);
}

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw last;
}

/** Group txs into batches of ≤10 whose blocks span ≤1000 (precompile shared-continuity limits). */
export function groupForBatches(txs: QualifyingTx[], maxPer = 10, span = 1000): QualifyingTx[][] {
  const sorted = [...txs].sort((a, b) => a.block - b.block);
  const groups: QualifyingTx[][] = [];
  let cur: QualifyingTx[] = [];
  for (const tx of sorted) {
    if (cur.length === 0 || (cur.length < maxPer && tx.block - cur[0].block < span)) cur.push(tx);
    else {
      groups.push(cur);
      cur = [tx];
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}
