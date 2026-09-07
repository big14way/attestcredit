import { ethers } from 'ethers';
import { cc3, cc3Wallet, config, log } from '../config.js';
import { BUREAU_ABI } from '../abi/bureau.js';
import type { FlatBatch, SingleProof } from './prove.js';

export function bureau(signer?: ethers.Signer): ethers.Contract {
  const addr = config.bureauAddress();
  if (!addr) throw new Error('CreditBureauASC address unknown: deploy first (deployments/cc3-testnet.json)');
  return new ethers.Contract(addr, BUREAU_ABI, signer ?? cc3);
}

export function queryIdOf(chainKey: number, height: number, txIndex: number): string {
  // keccak256(uint256 chainKey ‖ uint64 height ‖ uint256 txIndex) — same as ASCBase._computeQueryId
  return ethers.keccak256(ethers.solidityPacked(['uint256', 'uint64', 'uint256'], [chainKey, height, txIndex]));
}

export async function isProcessed(chainKey: number, height: number, txIndex: number): Promise<boolean> {
  return (await bureau().processedQueries(queryIdOf(chainKey, height, txIndex))) as boolean;
}

export interface SubmitResult {
  txHash: string;
  gasUsed: bigint;
  blockNumber: number;
  queryIds: string[];
  facts: Array<{ subject: string; factType: number; reserve: string; amount: bigint; amountUsd6: bigint; sourceBlock: number; queryId: string; factId: string }>;
}

async function gasLimitFor(data: string, from: string, continuityLen: number): Promise<bigint> {
  try {
    const est = await cc3.estimateGas({ to: config.bureauAddress(), data, from });
    return (est * 135n) / 100n;
  } catch (e: any) {
    // pallet-evm does not always propagate precompile reverts during estimation; fall back to a size heuristic
    const fallback = BigInt(400_000 + continuityLen * 6_000);
    log(`gas estimation failed (${e.shortMessage ?? e.message}); using ${fallback}`);
    return fallback;
  }
}

function parseResult(receipt: ethers.TransactionReceipt, c: ethers.Contract): SubmitResult {
  const out: SubmitResult = { txHash: receipt.hash, gasUsed: receipt.gasUsed, blockNumber: receipt.blockNumber, queryIds: [], facts: [] };
  for (const l of receipt.logs) {
    let parsed: ethers.LogDescription | null = null;
    try {
      parsed = c.interface.parseLog({ topics: [...l.topics], data: l.data });
    } catch {
      continue;
    }
    if (!parsed) continue;
    if (parsed.name === 'QueryVerified') out.queryIds.push(parsed.args.queryId as string);
    if (parsed.name === 'FactRecorded') {
      const a = parsed.args;
      out.facts.push({
        subject: a.subject, factType: Number(a.factType), reserve: a.reserve, amount: a.amount, amountUsd6: a.amountUsd6,
        sourceBlock: Number(a.sourceBlock), queryId: a.queryId, factId: a.factId,
      });
    }
  }
  return out;
}

export async function submitSingle(p: SingleProof, action = 0): Promise<SubmitResult> {
  const w = cc3Wallet();
  const c = bureau(w);
  const args = [
    action, p.chainKey, p.headerNumber, p.txBytes, p.merkleProof.root,
    p.merkleProof.siblings.map((s) => [s.hash, s.isLeft]),
    p.continuityProof.lowerEndpointDigest, p.continuityProof.roots,
  ];
  const data = c.interface.encodeFunctionData('executeSingle', args);
  const gasLimit = await gasLimitFor(data, w.address, p.continuityProof.roots.length);
  const tx = await c.executeSingle(...args, { gasLimit });
  log(`submitted executeSingle ${tx.hash}`);
  const receipt = await tx.wait();
  return parseResult(receipt, c);
}

export async function submitBatch(b: FlatBatch): Promise<SubmitResult> {
  const w = cc3Wallet();
  const c = bureau(w);
  const args = [
    b.chainKey, b.heights, b.encodedTransactions,
    b.merkleProofs.map((m) => [m.root, m.siblings.map((s) => [s.hash, s.isLeft])]),
    [b.sharedContinuityProof.lowerEndpointDigest, b.sharedContinuityProof.roots],
  ];
  const data = c.interface.encodeFunctionData('executeBatch', args);
  const gasLimit = await gasLimitFor(data, w.address, b.sharedContinuityProof.roots.length);
  const tx = await c.executeBatch(...args, { gasLimit });
  log(`submitted executeBatch(${b.heights.length}) ${tx.hash}`);
  const receipt = await tx.wait();
  return parseResult(receipt, c);
}
