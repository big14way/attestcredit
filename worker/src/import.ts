import { groupForBatches, scanSubject, type QualifyingTx } from './aave/scan.js';
import { assertSepoliaChainKey, latestAttested, proveBatch, proveSingle } from './attest/prove.js';
import { isProcessed, submitBatch, submitSingle, queryIdOf, type SubmitResult } from './attest/submit.js';
import { config, log, sepolia } from './config.js';

export type Stage = 'found' | 'skipped' | 'waiting_attestation' | 'proving' | 'submitting' | 'verified' | 'failed';

export interface TxTrail {
  txHash: string;
  block: number;
  events: string[];
  stage: Stage;
  txIndex?: number;
  queryId?: string;
  attestedHeight?: number;
  continuityRoots?: number;
  creditcoinTx?: string;
  gasUsed?: string;
  facts?: SubmitResult['facts'];
  error?: string;
  batchId?: number;
}

export interface ImportEvent {
  type: 'scan' | 'plan' | 'tx' | 'batch' | 'done' | 'error';
  message: string;
  tx?: TxTrail;
  data?: unknown;
}

/** Whole pipeline for one subject: scan → group → prove → submit. Emits a structured event per stage. */
export async function importSubject(
  subject: string,
  emit: (e: ImportEvent) => void,
  opts: { fromBlock?: number; single?: boolean } = {},
): Promise<TxTrail[]> {
  await assertSepoliaChainKey();
  emit({ type: 'scan', message: `scanning Aave V3 Pool logs on Sepolia for ${subject}` });
  const found = await scanSubject(subject, opts.fromBlock, undefined, (a, b) =>
    emit({ type: 'scan', message: `scanning blocks ${a}–${b}` }),
  );
  const trails: TxTrail[] = found.map((t) => ({ ...t, stage: 'found' }));
  emit({ type: 'scan', message: `${found.length} qualifying transaction(s)`, data: trails });
  if (found.length === 0) {
    emit({ type: 'done', message: 'no Aave history for this address' });
    return trails;
  }

  // Skip queries the bureau has already processed (replay-safe, saves proofs)
  const receipts = await Promise.all(found.map((t) => sepolia.getTransactionReceipt(t.txHash)));
  const pending: QualifyingTx[] = [];
  for (let i = 0; i < found.length; i++) {
    const r = receipts[i]!;
    const tr = trails[i];
    tr.txIndex = r.index;
    tr.queryId = queryIdOf(config.sepoliaChainKey, r.blockNumber, r.index);
    if (await isProcessed(config.sepoliaChainKey, r.blockNumber, r.index)) {
      tr.stage = 'skipped';
      emit({ type: 'tx', message: 'already verified on Creditcoin', tx: tr });
    } else pending.push(found[i]);
  }

  const groups = opts.single ? pending.map((t) => [t]) : groupForBatches(pending);
  emit({ type: 'plan', message: `${pending.length} tx(s) in ${groups.length} batch(es) (≤10 tx / 1000 blocks each)`, data: groups });

  const trailOf = (h: string) => trails.find((t) => t.txHash === h)!;
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const maxH = Math.max(...group.map((t) => t.block));
    for (const t of group) {
      const tr = trailOf(t.txHash);
      tr.batchId = g;
      tr.stage = 'waiting_attestation';
      tr.attestedHeight = await latestAttested();
      emit({ type: 'tx', message: `waiting for Creditcoin to attest Sepolia block ${maxH}`, tx: tr });
    }
    try {
      for (const t of group) {
        const tr = trailOf(t.txHash);
        tr.stage = 'proving';
        emit({ type: 'tx', message: 'attested; building proof', tx: tr });
      }
      let result: SubmitResult;
      if (group.length === 1) {
        const p = await proveSingle(group[0].txHash);
        const tr = trailOf(group[0].txHash);
        tr.continuityRoots = p.continuityProof.roots.length;
        tr.attestedHeight = await latestAttested();
        tr.stage = 'submitting';
        emit({ type: 'tx', message: `proof built (${tr.continuityRoots} continuity roots); submitting executeSingle`, tx: tr });
        result = await submitSingle(p);
      } else {
        const b = await proveBatch(group.map((t) => t.txHash));
        for (const h of b.txHashes) {
          const tr = trailOf(h);
          tr.continuityRoots = b.sharedContinuityProof.roots.length;
          tr.attestedHeight = await latestAttested();
          tr.stage = 'submitting';
          emit({ type: 'tx', message: `batch proof built (${b.heights.length} txs share ${tr.continuityRoots} continuity roots); submitting executeBatch`, tx: tr });
        }
        result = await submitBatch(b);
      }
      for (const t of group) {
        const tr = trailOf(t.txHash);
        tr.stage = 'verified';
        tr.creditcoinTx = result.txHash;
        tr.gasUsed = result.gasUsed.toString();
        tr.facts = result.facts.filter((f) => f.queryId === tr.queryId);
        emit({ type: 'tx', message: `verified on Creditcoin in ${result.txHash} (gas ${result.gasUsed})`, tx: tr });
      }
      emit({
        type: 'batch',
        message: `batch ${g + 1}/${groups.length}: ${group.length} tx(s), gas ${result.gasUsed}, ${result.facts.length} fact(s)`,
        data: { batch: g, txs: group.length, gasUsed: result.gasUsed.toString(), creditcoinTx: result.txHash, facts: result.facts.length },
      });
      log(`GAS batch=${g} txs=${group.length} gasUsed=${result.gasUsed} perTx=${result.gasUsed / BigInt(group.length)} cc3Tx=${result.txHash}`);
    } catch (e: any) {
      const msg = e.shortMessage ?? e.message ?? String(e);
      for (const t of group) {
        const tr = trailOf(t.txHash);
        tr.stage = 'failed';
        tr.error = msg;
        emit({ type: 'tx', message: `failed: ${msg}`, tx: tr });
      }
    }
  }
  emit({ type: 'done', message: 'import finished', data: trails });
  return trails;
}
