# Scoring

The score is computed **on-chain, deterministically, from on-chain facts only** by `contracts/src/ScoreEngine.sol`.
There is no off-chain input. Anyone can call `CreditLedger.getBreakdown(subject)` and reproduce every point below.

## Inputs (`CreditProfile`, stored by `CreditLedger`)

| Field | Source |
|---|---|
| `borrowCount`, `borrowedVolumeUsd6` | Aave V3 `Borrow` events proven via Attestcoin (subject = `onBehalfOf`) |
| `repayCount`, `repaidVolumeUsd6`, `lastRepayBlock` | Aave V3 `Repay` events proven via Attestcoin (subject = `user`, the debtor) |
| `liquidationCount`, `lastLiquidationBlock` | Aave V3 `LiquidationCall` events proven via Attestcoin (subject = `user`) |
| `firstActivityBlock` | lowest Sepolia block among proven facts |
| `nativeRepayCount`, `nativeDefaultCount` | `TieredLender.repay()` / `markDefault()` on Creditcoin (no proof needed) |

`nowBlock` (for tenure and recency) is the **latest Sepolia height attested on Creditcoin**, read from the ChainInfo
precompile (`0x…0fD3`, `get_latest_attestation_height_and_hash(1)`), never lower than the highest block already proven
into the ledger. So "time" in the score is itself an attested fact.

## Formula (integer math, default parameters)

```
base                = 300
repay_pts           = min(repayCount, 40) * 6                            (max 240)
volume_pts          = min(bitlen(floor(repaidVolumeUsd6 / 1e6)), 12) * 8   (max 96; bitlen = "log2ish")
ratio_pts           = clamp(repaidVolume / max(borrowedVolume, 1), 0, 1) * 80   (0..80)
tenure_pts          = min((nowBlock - firstActivityBlock) / 50_400, 24) * 4     (≈1 week of Sepolia blocks per unit; max 96)
recency_pts         = lastRepay within 216_000 blocks (≈30 d) ? 40 : within 648_000 (≈90 d) ? 20 : 0
native_pts          = min(nativeRepayCount, 10) * 5                      (max 50)
liquidation_penalty = liquidationCount > 0 ? 90 + 45 * (liquidationCount - 1) : 0
                      + 60 if lastLiquidation within 648_000 blocks
default_penalty     = nativeDefaultCount * 120

score = clamp(base + repay + volume + ratio + tenure + recency + native − liquidation − default, 300, 850)
```

### Tiers

| Tier | Score |
|---|---|
| 0 Bronze | < 500 |
| 1 Silver | 500 – 649 |
| 2 Gold | 650 – 749 |
| 3 Platinum | ≥ 750 |

### Worked example (asserted in `test/ScoreEngine.t.sol::test_documentedExample`)

12 repays, $5,000 repaid against $5,000 borrowed, first activity 10 weeks ago, last repay 2 days ago, 2 native repays:

```
300 + 72 (12×6) + 96 (bitlen(5000)=13→cap 12, ×8) + 80 (ratio 1.0) + 40 (10 units ×4) + 40 (recent) + 10 (2×5) = 638 → Silver
```

## Parameters

All constants live in `ScoreEngine.Params` and can be tuned by the owner (`setParams`). Defaults are
`ScoreEngine.defaultParams()`. Every parameter change emits `ParamsUpdated`.

## USD normalisation (`AaveV3Events.usdValue6`)

Sepolia reserves have no real price, so volume uses a **fixed, documented per-reserve scale**:

| Reserve | Decimals | Scale |
|---|---|---|
| USDC, USDT | 6 | 1 : 1 |
| DAI, GHO | 18 | 1 : 1 |
| WETH | 18 | 2 500 USD |
| WBTC | 8 | 60 000 USD |
| LINK | 18 | 15 USD |
| anything else | – | **0** (counted, never valued) |

On mainnet this would be a price feed. **Volume is a secondary signal**: counts, repay/borrow ratio, tenure, recency
and liquidations are the primary signals, and every one of them is price-independent.

## Properties (tested)

- More repays never lower the score (fuzzed, `testFuzz_moreRepaysNeverLowerScore`).
- A liquidation never raises the score (fuzzed, `testFuzz_liquidationNeverRaisesScore`).
- Score is always within `[300, 850]`; tier boundaries are exact.
- Every component is capped, so wash borrow/repay loops saturate (see `THREAT_MODEL.md`).
