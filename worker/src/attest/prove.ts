import { proofProvider, chainInfo } from '@gluwa/usc-sdk';
import { cc3, config, log, sepolia } from '../config.js';

export type SingleProof = proofProvider.ContinuityResponse;
export type BatchProof = proofProvider.BatchContinuityResponse;

const builder = new proofProvider.service.ProofBuilder(config.sepoliaChainKey, config.proverUrl);
const info = new chainInfo.PrecompileChainInfoProvider(cc3);

/** Startup guard required by the spec: Sepolia MUST be chainKey 1 on this Creditcoin network. */
export async function assertSepoliaChainKey(): Promise<void> {
  const chains = await info.getSupportedChains();
  const sep = chains.find((c) => c.chainId === 11155111);
  log('Attestcoin supported chains:', chains.map((c) => `${c.chainKey}→chainId ${c.chainId}`).join(', '));
  if (!sep || sep.chainKey !== config.sepoliaChainKey) {
    throw new Error(`Sepolia chainKey mismatch: precompile says ${sep?.chainKey}, config says ${config.sepoliaChainKey}`);
  }
}

export async function latestAttested(): Promise<number> {
  return (await info.getLatestAttestedHeightAndHash(config.sepoliaChainKey)).height;
}

/** Wait until the proof builder has ingested the attestation covering `height`. Never fabricates. */
export async function waitAttested(height: number, timeoutMs = 20 * 60_000, onTick?: (latest: number) => void): Promise<void> {
  const latest = await latestAttested();
  onTick?.(latest);
  if (latest >= height) {
    // already attested on-chain; make sure the builder cache has it too
    await builder.waitUntilHeightAttested(config.sepoliaChainKey, height, 5_000, timeoutMs, 0);
    return;
  }
  log(`waiting for Creditcoin to attest Sepolia block ${height} (latest attested ${latest})`);
  await builder.waitUntilHeightAttested(config.sepoliaChainKey, height, 15_000, timeoutMs, 0);
}

export async function proveSingle(txHash: string): Promise<SingleProof> {
  const receipt = await sepolia.getTransactionReceipt(txHash);
  if (!receipt) throw new Error(`tx ${txHash} not found on Sepolia`);
  await waitAttested(receipt.blockNumber);
  const res = await builder.getProof(txHash);
  if (!res.success || !res.data) throw new Error(`prover failed for ${txHash}: ${res.error}`);
  return res.data;
}

export interface FlatBatch {
  chainKey: number;
  heights: number[];
  txHashes: string[];
  encodedTransactions: string[];
  merkleProofs: proofProvider.merkle.TransactionMerkleProof[];
  sharedContinuityProof: proofProvider.ContinuityProof;
  fromHeader: number;
  toHeader: number;
}

/** One shared continuity proof for ≤10 txs within 1000 blocks. Order: by (height, txIndex). */
export async function proveBatch(txHashes: string[]): Promise<FlatBatch> {
  if (txHashes.length === 0 || txHashes.length > 10) throw new Error('batch must be 1..10 txs');
  const receipts = await Promise.all(txHashes.map((h) => sepolia.getTransactionReceipt(h)));
  const heights = receipts.map((r, i) => {
    if (!r) throw new Error(`tx ${txHashes[i]} not found`);
    return r.blockNumber;
  });
  const span = Math.max(...heights) - Math.min(...heights);
  if (span >= 1000) throw new Error(`batch spans ${span} blocks (>1000)`);
  await waitAttested(Math.max(...heights));
  const res = await builder.getBatchProof(txHashes);
  if (!res.success || !res.data) throw new Error(`batch prover failed: ${res.error}`);
  return flattenBatch(res.data);
}

export function flattenBatch(b: BatchProof): FlatBatch {
  const out: FlatBatch = {
    chainKey: b.chainKey,
    heights: [],
    txHashes: [],
    encodedTransactions: [],
    merkleProofs: [],
    sharedContinuityProof: b.continuityProof,
    fromHeader: b.fromHeader,
    toHeader: b.toHeader,
  };
  const hs = [...b.merkleProofs.keys()].sort((a, c) => a - c);
  for (const h of hs) {
    const byIdx = b.merkleProofs.get(h)!;
    for (const idx of [...byIdx.keys()].sort((a, c) => a - c)) {
      const e = byIdx.get(idx)!;
      out.heights.push(h);
      out.txHashes.push(e.txHash);
      out.encodedTransactions.push(e.txBytes);
      out.merkleProofs.push(e.merkleProof);
    }
  }
  return out;
}

/** Fixture shape consumed by contracts/test/CreditBureauASC.t.sol */
export function toFixture(p: SingleProof, extra: Record<string, unknown> = {}) {
  return {
    txHash: p.txHash,
    chainKey: p.chainKey,
    height: p.headerNumber,
    txIndex: p.txIndex,
    encodedTransaction: p.txBytes,
    merkleRoot: p.merkleProof.root,
    siblings: p.merkleProof.siblings.map((s) => ({ hash: s.hash, isLeft: s.isLeft })),
    lowerEndpointDigest: p.continuityProof.lowerEndpointDigest,
    continuityRoots: p.continuityProof.roots,
    capturedAt: new Date().toISOString(),
    ...extra,
  };
}
