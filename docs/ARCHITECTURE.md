# Architecture

```
Ethereum Sepolia                      Worker (TypeScript)                       Creditcoin CC3 Testnet
─────────────────────                 ────────────────────────────────          ─────────────────────────────────
Aave V3 Pool  ──emits──▶  Borrow/     scan(address): eth_getLogs on Pool        CreditBureauASC (is ASCBase)
                          Repay/      filter by subject topics                   ├─ executeSingle()/executeBatch()
                          Liquidation group ≤10 tx / 1000 blocks                 ├─ verify via 0xFD2 (batch verifyAndEmit)
                                      waitUntilHeightAttested (prover)           ├─ EvmV1Decoder: status==1, log.address==POOL
                                      getBatchProof / getProof                   ├─ decode event → CreditProfile delta
                                      submit tx ─────────────────────────────▶   └─ emits FactRecorded, QueryVerified
                                                                                CreditLedger (profiles, facts, ICreditOracle)
                                                                                ScoreEngine (deterministic scoring, params)
                                                                                CreditPassport (ERC-721 soulbound, on-chain SVG)
                                                                                TieredLender (demo consumer of ICreditOracle)
                                                                                ChainInfo 0xfD3 (ledger clock: attested height)
Frontend (Next.js) ◀──── reads profiles/passport via viem; calls worker API for import; shows proof trail
```

## Contracts (`contracts/src`)

| Contract | Role |
|---|---|
| `CreditBureauASC` | Only contract that calls the block prover precompile. Verifies inclusion, decodes receipt, records Aave facts. Permissionless. |
| `CreditLedger` | Storage of `CreditProfile`s and `Fact`s. Implements `ICreditOracle`. Roles: `RECORDER_ROLE` (bureau), `NATIVE_RECORDER_ROLE` (lender). |
| `ScoreEngine` | Pure scoring over a profile + "now" block. Owner tunable `Params`. See `SCORING.md`. |
| `CreditPassport` | ERC-721 + ERC-5192 soulbound, `tokenId = uint160(subject)`, on-chain SVG read live from the ledger. |
| `TieredLender` | Demo lender: CTC collateral, TUSD loans, LTV/APR by tier read from `ICreditOracle` at borrow time. |
| `lib/AaveV3Events` | Event selectors, log decoders, fixed testnet USD scales. |
| `interfaces/IChainInfo` | Subset of the ChainInfo precompile used as the ledger clock. |

## Worker (`worker/src`)

| File | Purpose |
|---|---|
| `aave/scan.ts` | `eth_getLogs` on the Pool for the subject's Borrow/Repay/LiquidationCall; batch grouping. |
| `attest/prove.ts` | Chain key check, `waitUntilHeightAttested`, `getProof` / `getBatchProof`, fixture dump. |
| `attest/submit.ts` | Gas estimation with precompile fallback, `executeSingle` / `executeBatch`, event parsing. |
| `import.ts` | Full pipeline with per tx stage events. |
| `server.ts` | `POST /import`, `GET /jobs/:id`, `POST /seed` (operator wallet only), `GET /health`. |
| `seed/aaveSeed.ts` | Creates real Aave Sepolia history for the demo wallet. |
| `cli.ts` | `scan | prove | prove-batch | fixture | submit | submit-batch | import | seed | status`. |

## Web (`web/src`)

Next.js 15 App Router, wagmi v2 + viem, RainbowKit. Design tokens in `design/tokens.ts` derived from the landing page
design skill (Part B) and shared by the landing page and app screens. Live updates via `watchContractEvent` on
`ProfileUpdated` / `FactRecorded`.

## Identity

Creditcoin CC3 is EVM. The same private key controls the same address on Sepolia and Creditcoin, so an Ethereum
address's credit profile is owned on Creditcoin by that same address. Anyone can submit proofs for anyone
(permissionless indexing), but only the subject can mint its Passport.

## Data flow of one fact

1. Subject borrows on Aave Sepolia → Pool emits `Borrow` in tx T at height H.
2. Creditcoin attestors attest Sepolia up to H (periodic, automatic).
3. Worker: `waitUntilHeightAttested(1, H)` → `getBatchProof([T, …])` → `(txBytes, merkleProof, continuityProof)`.
4. Worker calls `CreditBureauASC.executeBatch(1, [H…], [txBytes…], [merkleProof…], sharedContinuity)`.
5. ASC: chain key check → query ids from `calculateTxIndex` → `VERIFIER.verifyAndEmit(batch)` → mark processed.
6. ASC: `decodeReceiptFields` → `receiptStatus == 1` → `getLogsByEventSignature` → `log.address_ == POOL` →
   `AaveV3Events.decodeBorrow` → `CreditLedger.recordFact`.
7. Ledger updates the profile, recomputes the score, emits `ProfileUpdated`. UI animates.
