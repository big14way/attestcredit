# Threat model

AttestCredit turns Ethereum Sepolia Aave V3 activity into a credit profile on Creditcoin. The trust base is the
Attestcoin Protocol's attestation of Sepolia blocks plus the code in `contracts/src`. This document lists what an
attacker might try and what stops them.

## 1. Sybil / fake history

**Attack.** Manufacture a good score for a fresh wallet.

**Why it fails.** A profile is built only from `Borrow`, `Repay` and `LiquidationCall` logs emitted by the real
Aave V3 Pool (`0x6Ae4…8951`) inside transactions that Creditcoin's attestors saw included in a finalised Sepolia
block. The only way to get a `Repay` fact is to actually repay a loan on Aave. A wallet can only prove **its own**
behaviour: the subject is taken from the event topics (`onBehalfOf`, `user`), never from the caller.
"Faking" history therefore means borrowing and repaying on Aave, which is the real thing.

**Residual.** Testnet capital is free, so a bot can grind history cheaply. On mainnet that costs real interest.
The scoring caps (40 repays, 12 volume bits, 24 tenure units, 10 native repays) bound the reward of grinding.

## 2. Spoofed events

**Attack.** Deploy a contract on Sepolia that emits Aave shaped `Repay` events, prove that tx.

**Why it fails.** `CreditBureauASC` records a log only if `log.address_ == AAVE_POOL`. Tested in
`test_ignoresAaveShapedLogsFromOtherContracts`.

## 3. Failed transactions

**Attack.** A reverted Aave tx still carries calldata; the precompile does not check success.

**Why it fails.** The ASC requires `receiptStatus == 1`. A revert has no logs anyway, but the check also guards
against future encodings. Tested against a **real** failed Pool tx (`test/fixtures/aave-failed-tx.json`).

## 4. Wrong chain

**Attack.** Prove a tx from another attested chain (chain key 3 = Ethereum mainnet) that happens to hit the same
Pool address.

**Why it fails.** Both entry points require `chainKey == 1` (Sepolia) before touching the verifier, and the inherited
`ASCBase.execute`, which cannot see the chain key, is hard disabled.

## 5. Replay

**Attack.** Submit the same proof twice to double count a repay.

**Why it fails.** Query id = `keccak256(chainKey ‖ height ‖ txIndex)`, identical to `ASCBase`. `processedQueries`
is checked before verification and set before processing, for single and batch paths; duplicates **inside** a batch
are rejected too.

## 6. Griefing with irrelevant proofs

**Attack.** Flood the bureau with proofs of unrelated Sepolia txs to consume query ids or bloat storage.

**Why it fails.** A tx with no Aave fact reverts (`NoAaveFacts`), so no query id is consumed and no storage is
written. The attacker pays the CC3 gas for nothing.

## 7. Partial batches

**Attack.** Slip one bad tx into a batch hoping the good ones are recorded before it fails.

**Why it fails.** `executeBatch` is all or nothing: any revert rolls back every fact and every `processedQueries`
write in the batch (`test_batchIsAllOrNothing`).

## 8. Attestation liveness

**Risk.** If Creditcoin stops attesting Sepolia, new facts cannot be proven. Existing facts remain valid; scores only
lose recency points over time. The worker never fabricates: it waits (with a visible countdown) and surfaces
"Creditcoin hasn't attested block N yet" instead of guessing.

## 9. Scoring manipulation

**Attack.** Wash loops (borrow, repay, borrow, repay) to farm repay count and ratio.

**Mitigations today.** Counts are capped (40 repays → 240 pts), ratio is capped at 1.0, tenure needs real elapsed
Sepolia blocks (cannot be faked), recency only rewards *having* repaid recently, and liquidation/default penalties
are large (90 / 120) and uncapped.

**Future work.** Per reserve minimum amounts, cooldown between counted repays of the same reserve, and a diminishing
weight for repays of very small size relative to the borrow. These are parameter and rule changes in `ScoreEngine`;
the ledger data already carries the fields needed.

## 10. Ledger write access

Only `CreditBureauASC` (`RECORDER_ROLE`) and `TieredLender` (`NATIVE_RECORDER_ROLE`) can write. The admin can rotate
the score engine; scores are recomputed from stored facts, so facts are never rewritten.

## 11. Passport

Soulbound: transfers, approvals and burns revert; `tokenId = uint160(subject)` so a subject can never hold two.
Only the subject can mint. The image reads the ledger at call time, so it cannot go stale or be forged.

## Out of scope

Precompile correctness, attestor collusion, Sepolia reorgs deeper than attestation finality, and the Aave contracts
themselves.
