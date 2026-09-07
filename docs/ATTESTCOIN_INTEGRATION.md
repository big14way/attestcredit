# How AttestCredit uses the Attestcoin Protocol

AttestCredit is a *readability* ASC (Application Smart Contract). It never asks anyone to attest to anything about a
wallet: it asks the Creditcoin network's own block prover precompile whether a specific Ethereum Sepolia transaction
was included in an attested block, then reads that transaction's receipt bytes itself.

## 1. Data path

```
 Sepolia                       Creditcoin attestors              Proof builder                CreditBureauASC (CC3)
 ───────                       ────────────────────              ─────────────                ─────────────────────
 tx T in block H  ──────────▶  attest H (periodic, automatic)    /attested-height/1  ◀──────  worker waits (SDK)
   Aave V3 Pool emits                                            /proof-by-tx/1/T
   Borrow/Repay/Liquidation                                      → txBytes (abi(txType, chunks[]))
                                                                 → merkleProof {root, siblings[]}
                                                                 → continuityProof {lowerEndpointDigest, roots[]}
                                                                          │
                                                                          ▼
                                                    executeBatch(chainKey=1, heights[], txBytes[], merkleProofs[], shared)
                                                          │ 1. chainKey == 1 (Sepolia)                     CreditBureauASC.sol:103
                                                          │ 2. queryId = keccak(chainKey‖height‖txIndex)   :110–134 (txIndex from VERIFIER.calculateTxIndex)
                                                          │ 3. !processedQueries[queryId] → mark            :111–112
                                                          │ 4. VERIFIER.verifyAndEmit(batch) == true        :117   ← precompile 0x…0FD2
                                                          │ 5. EvmV1Decoder.decodeReceiptFields(txBytes)    :148
                                                          │ 6. receiptStatus == 1                            :149
                                                          │ 7. getLogsByEventSignature(BORROW|REPAY|LIQ)    :172,185,199
                                                          │ 8. log.address_ == AAVE_POOL                     :174,187,201
                                                          │ 9. AaveV3Events.decode* → subject, reserve, amt  AaveV3Events.sol:48,62,77
                                                          ▼
                                                    CreditLedger.recordFact → profile delta → ScoreEngine.score → ProfileUpdated
                                                    CreditLedger.currentSourceBlock ← ChainInfo 0x…0fD3 (latest attested height)
```

## 2. Every Attestcoin touchpoint, with file and line

| # | Touchpoint | File | Lines |
|---|---|---|---|
| 1 | Chain key resolution: `getSupportedChains()` at startup, assert Sepolia is chain key **1** (not chainId 11155111) | `worker/src/attest/prove.ts` | 11–18 |
| 2 | `waitUntilHeightAttested` (proof builder cache), never fabricates, surfaces "not attested yet" | `worker/src/attest/prove.ts` | 26–36 |
| 3 | `ProofBuilder.getProof(txHash)` (single) | `worker/src/attest/prove.ts` | 39–44 |
| 4 | `ProofBuilder.getBatchProof(txHashes)` (≤10 txs, <1000 blocks) + flatten by (height, txIndex) | `worker/src/attest/prove.ts` | 58–101 |
| 5 | Batch grouping rule (≤10 per 1000 blocks) | `worker/src/aave/scan.ts` | 68–82 |
| 6 | Replay key computed client side to skip already processed queries | `worker/src/attest/submit.ts` | 12–19 |
| 7 | Gas estimation with precompile fallback (pallet-evm does not always propagate precompile reverts) | `worker/src/attest/submit.ts` | 27–37 |
| 8 | `executeSingle` submission | `worker/src/attest/submit.ts` | 62–78 |
| 9 | `executeBatch` submission | `worker/src/attest/submit.ts` | 80–94 |
| 10 | `chainKey == SEPOLIA_CHAIN_KEY` (single / batch) | `contracts/src/CreditBureauASC.sol` | 75 / 103 |
| 11 | `_computeQueryId` (inherited from ASCBase, single path) | `contracts/src/CreditBureauASC.sol` | 77 |
| 12 | `VERIFIER.calculateTxIndex` + replay key `keccak256(chainKey ‖ height ‖ txIndex)` (batch path, byte identical to ASCBase) | `contracts/src/CreditBureauASC.sol` | 128–135 |
| 13 | Replay protection `processedQueries` (single / batch, incl. intra batch duplicates) | `contracts/src/CreditBureauASC.sol` | 78, 84 / 111–112 |
| 14 | `verifyAndEmit` single (via inherited `_verifyProof`) | `contracts/src/CreditBureauASC.sol` | 80–83 |
| 15 | `verifyAndEmit` batch with shared continuity proof | `contracts/src/CreditBureauASC.sol` | 116–118 |
| 16 | `EvmV1Decoder.getTransactionType` / `isValidTransactionType` | `contracts/src/CreditBureauASC.sol` | 145–146 |
| 17 | `EvmV1Decoder.decodeReceiptFields` | `contracts/src/CreditBureauASC.sol` | 148 |
| 18 | `receiptStatus == 1` (precompile does **not** check success) | `contracts/src/CreditBureauASC.sol` | 149 |
| 19 | `EvmV1Decoder.getLogsByEventSignature` for the three Aave selectors | `contracts/src/CreditBureauASC.sol` | 172, 185, 199 |
| 20 | Log address check against the Aave Pool | `contracts/src/CreditBureauASC.sol` | 174, 187, 201 |
| 21 | Aave event selectors (asserted against `keccak256` of canonical signatures in tests) and decoders | `contracts/src/lib/AaveV3Events.sol` | 12–16, 48–90 |
| 22 | Inherited `ASCBase.execute` hard disabled (cannot see chain key) | `contracts/src/CreditBureauASC.sol` | 141–143 |
| 23 | Ledger clock from the ChainInfo precompile `get_latest_attestation_height_and_hash(1)` | `contracts/src/interfaces/IChainInfo.sol`, `contracts/src/CreditLedger.sol` | 12–31, 124–129 |
| 24 | Mock precompile for tests (etched at `0x…0FD2`), tx index derived from Merkle path and asserted equal to the prover's | `contracts/test/utils/MockVerifier.sol`, `contracts/test/CreditBureauASC.t.sol` | all, 88–95 |

Fixtures in `contracts/test/fixtures/` are real prover responses for real Sepolia transactions
(`aave-borrow-usdc`, `aave-repay-usdc`, `aave-failed-tx` = a genuinely reverted Pool call, `non-aave-tx`), captured
with `worker cli fixture <txHash>`.

## 3. Why batch proofs matter here

A wallet's credit history is many transactions. A continuity proof carries one root per block between the attestation
checkpoint and the target block, so proving N transactions one at a time repeats that cost N times. The batch
precompile call verifies up to 10 transactions within 1000 blocks against **one** shared continuity proof, and the
proof builder's `getBatchProof` returns exactly that shape (one `continuityProof`, a map of `height → txIndex → merkle
proof`). The worker groups qualifying transactions greedily into ≤10 per 1000 block window
(`worker/src/aave/scan.ts:68`) and submits each group with `executeBatch`, which is all or nothing.

### Measured gas (CC3 testnet)

_To be filled from real testnet runs after deployment (see §6). The worker logs `GAS batch=… gasUsed=… perTx=…` for
every submission._

| Path | Txs | Continuity roots | Gas used | Gas / tx | Creditcoin tx |
|---|---|---|---|---|---|
| `executeSingle` | 1 | – | – | – | – |
| `executeBatch` | – | – | – | – | – |

## 4. Security: what the precompile guarantees, and what we add

| The precompile (`0x…0FD2`) | Does | Does not | Closed by |
|---|---|---|---|
| Inclusion | Proves `encodedTransaction` hashes into `merkleRoot` at `height` and that `height` chains to an attested digest | Check the tx succeeded | `receiptStatus == 1` (`CreditBureauASC.sol:149`) |
| Source | Binds the proof to `chainKey` | Restrict which chain your ASC accepts | `chainKey == 1` before anything else (`:75`, `:103`) |
| Content | Returns nothing about *what* the tx did | Know which contract emitted a log | `log.address_ == AAVE_POOL` (`:174`, `:187`, `:201`) |
| Uniqueness | Nothing | Prevent the same proof being submitted twice | `processedQueries` keyed by `keccak(chainKey‖height‖txIndex)` (`:78`, `:111`) |
| Batching | Verifies all or reverts | Roll back your own state | `executeBatch` marks and processes in one tx; any `NoAaveFacts` / decode failure reverts everything |
| Relevance | Nothing | Stop irrelevant txs consuming query ids | `NoAaveFacts` revert → no storage write, no query id consumed (`:162`) |

## 5. Limitations, stated plainly

- **Transaction inclusion proofs only.** No state proofs: balances, prices and storage are invisible. Everything
  scored is inside a single transaction's receipt.
- **Sepolia only on testnet.** The chain key is a constant; mainnet Ethereum (chain key 3) would need its own
  Pool address and price handling.
- **Volumes use fixed testnet scales** (`AaveV3Events.usdValue6`). On mainnet this is a price feed. Counts, ratio,
  tenure and liquidations are the primary, price independent signals.
- **Attestation latency.** A fact can be proven only after Creditcoin attests its block (minutes on testnet).
- **Aave V3 only.** Compound and Morpho have different events; adding them is a new `lib/*Events.sol` and three
  more selectors in the ASC.

## 6. Deployed addresses and verification transactions (CC3 testnet)

_Filled after deployment._

| Contract | Address |
|---|---|
| CreditBureauASC | – |
| CreditLedger | – |
| ScoreEngine | – |
| CreditPassport | – |
| TieredLender | – |
| TestUSD | – |

| Sepolia tx | Event | Creditcoin verification tx |
|---|---|---|
| – | – | – |
