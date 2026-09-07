#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { config, log } from './config.js';
import { groupForBatches, scanSubject } from './aave/scan.js';
import { assertSepoliaChainKey, latestAttested, proveBatch, proveSingle, toFixture } from './attest/prove.js';

const [cmd, ...args] = process.argv.slice(2);

function flag(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));

const usage = `attestcredit worker
  scan <address> [--from <block>]     find qualifying Aave V3 Sepolia txs for a subject
  prove <txHash>                      wait for attestation, build a single proof, print JSON
  prove-batch <txHash...>             group ≤10 txs / 1000 blocks, build batch proofs
  fixture <txHash> [--name <n>]       dump a real proof to contracts/test/fixtures/<name>.json
  submit <proofFile>                  call CreditBureauASC.executeSingle
  submit-batch <batchFile>            call CreditBureauASC.executeBatch
  import <address>                    scan → group → prove → submit (skips processed queries)
  seed [privateKey]                   create REAL Aave history on Sepolia for the demo wallet
  status                              print chain-key check + latest attested Sepolia height`;

async function main() {
  switch (cmd) {
    case 'status': {
      await assertSepoliaChainKey();
      log('latest attested Sepolia height:', await latestAttested());
      break;
    }
    case 'scan': {
      const [address] = positional;
      if (!address) throw new Error('scan <address>');
      const from = flag('from') ? Number(flag('from')) : undefined;
      const txs = await scanSubject(address, from, undefined, (a, b) => process.stderr.write(`\rscanning ${a}-${b}   `));
      process.stderr.write('\n');
      console.log(JSON.stringify(txs, null, 2));
      log(`${txs.length} qualifying tx(s); ${groupForBatches(txs).length} batch(es)`);
      break;
    }
    case 'prove': {
      const [txHash] = positional;
      if (!txHash) throw new Error('prove <txHash>');
      await assertSepoliaChainKey();
      const p = await proveSingle(txHash);
      console.log(JSON.stringify(toFixture(p), null, 2));
      break;
    }
    case 'prove-batch': {
      if (positional.length === 0) throw new Error('prove-batch <txHash...>');
      await assertSepoliaChainKey();
      const receipts = await Promise.all(positional.map(async (h) => ({ txHash: h, block: (await (await import('./config.js')).sepolia.getTransactionReceipt(h))!.blockNumber, events: [] as any })));
      const groups = groupForBatches(receipts);
      const out = [];
      for (const g of groups) {
        const b = await proveBatch(g.map((t) => t.txHash));
        out.push(b);
        log(`batch ${b.fromHeader}-${b.toHeader}: ${b.heights.length} tx(s), ${b.sharedContinuityProof.roots.length} continuity roots`);
      }
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'fixture': {
      const [txHash] = positional;
      if (!txHash) throw new Error('fixture <txHash> [--name <n>]');
      const p = await proveSingle(txHash);
      const name = flag('name') ?? `tx-${txHash.slice(2, 10)}`;
      fs.mkdirSync(config.fixturesDir, { recursive: true });
      const file = path.join(config.fixturesDir, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(toFixture(p), null, 2));
      log(`wrote ${path.relative(process.cwd(), file)} (height ${p.headerNumber}, txIndex ${p.txIndex}, ${p.continuityProof.roots.length} roots)`);
      break;
    }
    case 'submit': {
      const { submitSingle } = await import('./attest/submit.js');
      const file = positional[0];
      if (!file) throw new Error('submit <proofFile>');
      const f = JSON.parse(fs.readFileSync(file, 'utf8'));
      const p = {
        chainKey: f.chainKey, headerNumber: f.height, txIndex: f.txIndex, txHash: f.txHash, txBytes: f.encodedTransaction,
        merkleProof: { root: f.merkleRoot, siblings: f.siblings }, continuityProof: { lowerEndpointDigest: f.lowerEndpointDigest, roots: f.continuityRoots },
        cached: false, generatedAt: new Date(),
      };
      const r = await submitSingle(p as any);
      log(`verified on Creditcoin: ${r.txHash} gasUsed=${r.gasUsed} facts=${r.facts.length}`);
      console.log(JSON.stringify(r, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
      break;
    }
    case 'submit-batch': {
      const { submitBatch } = await import('./attest/submit.js');
      const file = positional[0];
      if (!file) throw new Error('submit-batch <batchFile>');
      const batches = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const b of Array.isArray(batches) ? batches : [batches]) {
        const r = await submitBatch(b);
        log(`verified batch on Creditcoin: ${r.txHash} gasUsed=${r.gasUsed} txs=${b.heights.length} facts=${r.facts.length}`);
        console.log(JSON.stringify(r, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
      }
      break;
    }
    case 'import': {
      const { importSubject } = await import('./import.js');
      const [address] = positional;
      if (!address) throw new Error('import <address>');
      await importSubject(address, (e) => log(JSON.stringify(e)));
      break;
    }
    case 'seed': {
      const { seed } = await import('./seed/aaveSeed.js');
      await seed(positional[0]);
      break;
    }
    default:
      console.log(usage);
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((e) => {
  console.error('error:', e.shortMessage ?? e.message ?? e);
  process.exit(1);
});
