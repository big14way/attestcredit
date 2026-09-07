# Deviations from the build specification

Everything not listed here follows the spec as written.

1. **`EvmV1Decoder` is inlined, not linked.** In `@gluwa/asc-contracts@0.2.1` every function of `EvmV1Decoder`
   is `internal`, so the compiler inlines it and `forge create --libraries …` is a no-op. The address in the official
   examples' `.env.example` (`0x04B9…D18B`) holds a 29-byte stub on CC3 testnet that always reverts (`cast code` →
   `0x5f80fd…`). We therefore deploy no separate library; `deployments/cc3-testnet.json` records
   `evmV1Decoder` for reference only.

2. **Entry points are `executeSingle` / `executeBatch`, not `execute` / `executeBatch`.** `ASCBase.execute` is
   `external` and non-virtual, and it does not pass `chainKey` to `_processAndEmitEvent`, so it cannot enforce the
   Sepolia chain-key check. `CreditBureauASC` keeps the inherited `_verifyProof`, `_computeQueryId` and
   `processedQueries`, adds the two typed entry points, and hard-disables the inherited `execute`
   (`_processAndEmitEvent` reverts with `UseTypedEntrypoints()` when it was not called through our entry points).
   Tested in `test_inheritedExecuteIsDisabled`.

3. **Ledger clock reads the ChainInfo precompile.** The spec leaves "now" for tenure/recency undefined. We use the
   latest Sepolia height attested on Creditcoin (`0x…0fD3`), falling back to the highest block proven into the ledger.
   One extra Attestcoin touchpoint, zero off-chain input.

4. **Extra stable reserves in the USD table.** USDT and GHO (both 1:1) are added to the five reserves listed in the
   spec, because the demo wallet may be forced onto USDT by Sepolia liquidity. Unknown reserves still count as 0.

5. **Seed uses LINK as collateral.** On 2026-09-07 DAI, USDC and USDT were all above their Aave Sepolia supply caps
   (Aave error `51`), so `worker seed` supplies LINK (no cap) and borrows USDC, falling back to USDT only if USDC
   liquidity is exhausted. All history is still real Aave V3 Pool activity.

6. **Native facts are stored in the ledger's audit trail too.** `TieredLender` repayments/defaults appear as
   `Fact`s with `queryId = 0` so `/app/proofs` can show one unified history.

7. **Design skill installed by file download.** `.claude/skills/landing-page-design/SKILL.md` was fetched over
   HTTPS from the same repository the spec names (a `git clone` into the project directory was blocked by the
   tooling sandbox). Content is identical.
