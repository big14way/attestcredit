<p align="center">
  <img src="web/public/favicon.svg" width="72" alt="AttestCredit mark" />
</p>

<h1 align="center">AttestCredit</h1>

<p align="center"><strong>The cross-chain credit bureau on Creditcoin, powered by the Attestcoin Protocol.</strong></p>

<p align="center">
  <a href="https://youtu.be/s8GyOREF75E">Demo video (3 min)</a> ·
  <a href="https://attestcredit.vercel.app">Live app</a> ·
  <a href="https://attestcredit.vercel.app/lookup/0x3C343AD077983371b29fee386bdBC8a92E934C51">Bureau lookup of the demo wallet</a> ·
  <a href="docs/ATTESTCOIN_INTEGRATION.md">Attestcoin integration</a> ·
  <a href="docs/SCORING.md">Scoring</a>
</p>

<p align="center">
  <a href="https://github.com/big14way/attestcredit/actions/workflows/ci.yml"><img src="https://github.com/big14way/attestcredit/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/network-Creditcoin%20CC3%20testnet-8AF0C8" alt="CC3 testnet" />
  <img src="https://img.shields.io/badge/source%20chain-Ethereum%20Sepolia%20(chain%20key%201)-9B9B9B" alt="Sepolia" />
  <img src="https://img.shields.io/badge/license-MIT-9B9B9B" alt="MIT" />
</p>

---

AttestCredit proves a wallet's Aave V3 borrow, repay and liquidation transactions from Ethereum **inside a Creditcoin smart contract**, with no oracle operator, no bridge and no trusted indexer. From those proven facts it builds an on-chain credit profile, computes a deterministic 300–850 score, mints a soulbound Credit Passport, and exposes one read interface (`ICreditOracle`) that any lender on Creditcoin can call. It is not another lending app. It is the credit infrastructure every Creditcoin lending app needs, and the first project that uses Attestcoin for exactly what it was designed for: reading real financial behaviour from another chain, trustlessly.

Built for **BUIDL CTC 2026 Fall** (Creditcoin & Credit Labs).

## Contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [How it works: architecture and data flow](#how-it-works-architecture-and-data-flow)
- [What is live on testnet](#what-is-live-on-testnet)
- [Integrate in five minutes](#integrate-in-five-minutes)
- [Scoring](#scoring)
- [Identity](#identity)
- [Security model](#security-model)
- [Quickstart](#quickstart)
- [Repository layout](#repository-layout)
- [Business model](#business-model)
- [Roadmap](#roadmap)
- [Team and license](#team-and-license)

## The problem

Credit history that cannot travel is not credit history.

- **On chain, every wallet starts from zero on every chain.** Aave alone holds over $12 billion in outstanding loans, roughly half of all DeFi lending. Every one of those repayments is public and permanent, and completely unreadable by a lender on any other chain. A borrower with years of flawless Aave history is priced like a stranger the moment they leave Ethereum.
- **Off chain, the same wall exists at borders.** Fewer than one in ten Nigerian adults has a credit bureau file (World Bank, private credit bureau coverage 7.8%). Move countries and your file stays behind; an entire company, Nova Credit, exists only to translate it. For the people Creditcoin was founded to serve, the best credit data they will ever have is already on chain, and nobody could read it.
- **The only bridges today are oracles.** Someone signs a claim about your history and asks the lender to trust them. Lenders do not price risk on hearsay, and every oracle is a single point of failure and censorship.

## The solution

AttestCredit proves the history instead of trusting anyone with it.

1. **Prove.** Creditcoin's attestors attest Ethereum Sepolia block hashes. The Attestcoin block-prover precompile (`0x…0FD2`) verifies that a specific transaction is included under one of those hashes and hands our contract the raw receipt bytes.
2. **Decode and check.** `CreditBureauASC` requires the Sepolia chain key, requires the transaction succeeded, requires the log was emitted by the real Aave V3 Pool, rejects replays, and rejects transactions with no Aave fact so nothing irrelevant is ever recorded.
3. **Score.** `CreditLedger` stores the fact and recomputes a deterministic score on the spot. `ScoreEngine` is pure integer math over counts, repay-to-borrow ratio, tenure, recency and liquidations. No off-chain input of any kind.
4. **Carry.** The subject mints a soulbound `CreditPassport` whose image is rendered on chain from the live ledger. Any lender reads `getScore(subject)`. The `TieredLender` demo prices LTV and APR from it in under 40 lines.

Batch proofs verify up to ten transactions with one shared continuity proof, so a whole history imports in a few calls: measured on CC3 testnet at **361,150 gas per transaction batched** versus 568,788 for a single proof.

## How it works: architecture and data flow

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
                                                                                TieredLender (demo consumer)
                                                                                ChainInfo 0xfD3 (ledger clock: attested height)
Frontend (Next.js) ◀──── reads profiles/passport via viem; calls worker API for import; shows proof trail
```

### Life of one fact

```mermaid
sequenceDiagram
    participant U as Borrower (same key on both chains)
    participant A as Aave V3 Pool (Sepolia)
    participant W as Worker
    participant P as Proof builder
    participant V as BlockProver precompile 0x…0FD2
    participant B as CreditBureauASC
    participant L as CreditLedger / ScoreEngine

    U->>A: repay(USDC)
    A-->>A: emit Repay(reserve, user, repayer, amount)
    W->>A: eth_getLogs(Pool, Repay, user = subject)
    W->>P: waitUntilHeightAttested(chainKey 1, height)
    W->>P: getBatchProof([tx…]) → txBytes, merkleProofs, sharedContinuityProof
    W->>B: executeBatch(1, heights, txBytes, merkleProofs, shared)
    B->>B: chainKey == 1; queryId = keccak(chainKey‖height‖txIndex); !processed
    B->>V: verifyAndEmit(batch)
    V-->>B: true (emits TransactionVerified per tx)
    B->>B: decodeReceiptFields; status == 1; log.address == AAVE_POOL; decodeRepay
    B->>L: recordFact(subject, Repay, reserve, amount, usd6, height, queryId)
    L->>L: profile delta → ScoreEngine.score(profile, latestAttestedHeight)
    L-->>U: ProfileUpdated(subject, score, tier)
```

### Components

| Layer | Component | Role |
|---|---|---|
| Contracts | `CreditBureauASC` | The only contract that calls the precompile. Verifies inclusion, decodes receipts, records Aave facts. Permissionless: anyone may submit proofs for anyone. |
| | `CreditLedger` | Profiles, per-fact audit trail, `ICreditOracle`. Uses the ChainInfo precompile as its clock so "now" is itself an attested fact. |
| | `ScoreEngine` | Deterministic scoring, owner-tunable parameters, fuzz-tested monotonicity. |
| | `CreditPassport` | ERC-721 + ERC-5192 soulbound. `tokenId = uint160(subject)`. On-chain SVG. |
| | `TieredLender` | Demo consumer: CTC collateral, TUSD loans, terms by tier, native repayments feed the ledger. |
| Worker | `scan · prove · import · server` | Finds qualifying transactions, waits for attestation, builds single and batch proofs, submits, exposes a job API for the proof trail. |
| Web | Next.js 15, wagmi, viem | Landing, dashboard with live proof trail, proofs, lender, public `/lookup/<address>`, docs. Every number on screen is read from chain. |

Full diagrams, the touchpoint table with file and line references, and measured gas are in [`docs/ATTESTCOIN_INTEGRATION.md`](docs/ATTESTCOIN_INTEGRATION.md). Threats and mitigations are in [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## What is live on testnet

| | |
|---|---|
| Web app | https://attestcredit.vercel.app |
| Proof worker API | https://worker-production-54d2.up.railway.app/health |
| Network | Creditcoin CC3 testnet, chainId 102031, explorer https://creditcoin-testnet.blockscout.com |
| Source chain | Ethereum Sepolia, Attestcoin chain key **1** (not the EVM chainId) |

### Deployed contracts (CC3 testnet)

| Contract | Address |
|---|---|
| CreditLedger (`ICreditOracle`) | [`0x211a38792781b2c7a584a96F0e735d56e809fe85`](https://creditcoin-testnet.blockscout.com/address/0x211a38792781b2c7a584a96F0e735d56e809fe85) |
| CreditBureauASC | [`0x789f82778A8d9eB6514a457112a563A89F79A2f1`](https://creditcoin-testnet.blockscout.com/address/0x789f82778A8d9eB6514a457112a563A89F79A2f1) |
| ScoreEngine | [`0xcd529F43bBA9be57f3e61Cc5070A7f03F5F23f4a`](https://creditcoin-testnet.blockscout.com/address/0xcd529F43bBA9be57f3e61Cc5070A7f03F5F23f4a) |
| CreditPassport | [`0x4f330C74c7bd84665722bA0664705e2f2E6080DC`](https://creditcoin-testnet.blockscout.com/address/0x4f330C74c7bd84665722bA0664705e2f2E6080DC) |
| TieredLender | [`0x199516b47F1ce8C77617b58526ad701bF1f750FA`](https://creditcoin-testnet.blockscout.com/address/0x199516b47F1ce8C77617b58526ad701bF1f750FA) |
| TestUSD | [`0x4adDFcfa066E0c955bC0347d9565454AD7Ceaae1`](https://creditcoin-testnet.blockscout.com/address/0x4adDFcfa066E0c955bC0347d9565454AD7Ceaae1) |

Source of truth: [`deployments/cc3-testnet.json`](deployments/cc3-testnet.json).

### Real end-to-end verifications

| What | Sepolia | Creditcoin |
|---|---|---|
| Demo wallet, 7 Aave txs, **one batch proof** | [`0x3C34…4C51`](https://sepolia.etherscan.io/address/0x3C343AD077983371b29fee386bdBC8a92E934C51) | [`0x874c8e88…`](https://creditcoin-testnet.blockscout.com/tx/0x874c8e889f653be491ac73c0a98398eda23b4ae76da99e061f9e0344d0a8b929) · 2,528,055 gas |
| Fresh wallet from the video, 6 Aave txs, one batch proof | [`0x149d…d427`](https://sepolia.etherscan.io/address/0x149d19De1a727FB947c0831962d91894F418d427) | [`0x1395dad9…`](https://creditcoin-testnet.blockscout.com/tx/0x1395dad92f79f47bec3ff8234b130ab257096f6aa0a26dd3fb1baaefc3c01d0c) · 2,149,175 gas |
| Single Borrow proof | [`0xb8f2b680…`](https://sepolia.etherscan.io/tx/0xb8f2b680d9ecc2c00d31e115ef6c1f6512699e1dc393f2280bf10e104cf05f25) | [`0xde30309c…`](https://creditcoin-testnet.blockscout.com/tx/0xde30309c29bc6bcf0289eb4366f5be71d08a9123dc2788a0f4c835bf2dcb8810) · 568,788 gas |
| Single Repay proof | [`0x8673c7e7…`](https://sepolia.etherscan.io/tx/0x8673c7e7438897926a0a7b8c8a0efc212444154a6fd6bd33d16832112c79d5e2) | [`0x46c49dc7…`](https://creditcoin-testnet.blockscout.com/tx/0x46c49dc75451c4c7335cf659e66bf113ff37708948e5bbc3f038d7412d6918e3) · 506,007 gas |

Open the Logs tab of either batch transaction to see one `TransactionVerified(chainKey, height, txIndex)` event from the BlockProver precompile per Sepolia transaction.

## Integrate in five minutes

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICreditOracle {
    /// @return score 300–850   @return tier 0 Bronze, 1 Silver, 2 Gold, 3 Platinum
    function getScore(address subject) external view returns (uint16 score, uint8 tier);
    function factCount(address subject) external view returns (uint256);
}

contract MyLender {
    ICreditOracle public constant BUREAU = ICreditOracle(0x211a38792781b2c7a584a96F0e735d56e809fe85); // CreditLedger, CC3 testnet

    function ltvBps(address user) public view returns (uint16) {
        (, uint8 tier) = BUREAU.getScore(user);
        if (tier == 3) return 8000; // Platinum
        if (tier == 2) return 7000; // Gold
        if (tier == 1) return 5500; // Silver
        return 4000;                // Bronze
    }
}
```

`getProfile(subject)` returns the full `CreditProfile` and `CreditLedger.getBreakdown(subject)` returns every scoring component, so a lender can audit any score down to the Sepolia block it came from.

## Scoring

Integer math, computed on chain, fully reproducible from `CreditLedger.getBreakdown`:

```
base 300
+ min(repays, 40) × 6                              max 240
+ min(bitlen(floor(repaid USD)), 12) × 8            max 96
+ clamp(repaid ÷ borrowed, 0, 1) × 80               max 80
+ min(weeks since first proven fact, 24) × 4        max 96
+ recency: repaid within 30 d → 40, within 90 d → 20
+ min(native Creditcoin repays, 10) × 5             max 50
− liquidations: 90 first, +45 each more, +60 if within 90 d
− native defaults × 120
clamp 300 … 850        Bronze <500 · Silver 500–649 · Gold 650–749 · Platinum ≥750
```

"Now" for tenure and recency is the latest Sepolia height attested on Creditcoin, read from the ChainInfo precompile. Volume uses fixed testnet scales and is a secondary signal; counts, ratio, tenure, recency and liquidations are price independent. Details and a worked example in [`docs/SCORING.md`](docs/SCORING.md).

## Identity

Creditcoin CC3 is EVM. **The same private key controls the same address on Sepolia and on Creditcoin.** An Ethereum address's credit profile is therefore owned on Creditcoin by that same address: no signature bridging, no oracle. Anyone may submit proofs for any subject (permissionless indexing, like a bureau), but only the subject can mint its Passport and only the subject sees "my" views in the app. The credit subject of each fact is taken from the Aave event topics (`onBehalfOf` for Borrow, `user` for Repay and LiquidationCall), never from the caller.

## Security model

| The precompile guarantees | It does not | Closed in code |
|---|---|---|
| The transaction is included in an attested Sepolia block | that the transaction succeeded | `receiptStatus == 1` |
| The proof is bound to a chain key | which chain your contract accepts | `chainKey == 1` before anything else |
| The receipt bytes are authentic | which contract emitted a log | `log.address_ == AAVE_POOL` |
| — | uniqueness | `processedQueries[keccak(chainKey‖height‖txIndex)]`, single and batch, including duplicates inside a batch |
| — | that irrelevant proofs do nothing | a transaction with no Aave fact reverts; no query id is consumed, no storage is written |
| — | atomicity of your own state | batches are all or nothing |

41 Foundry tests cover these paths using **real prover fixtures** for real Sepolia transactions (a borrow, a repay, a genuinely reverted Pool call, and a plain transfer) with only the precompile mocked. Full analysis in [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## Quickstart

Requirements: Node 20+, pnpm 10, Foundry.

```bash
git clone https://github.com/big14way/attestcredit && cd attestcredit
pnpm install
cp .env.example .env               # PRIVATE_KEY (CC3 + Sepolia), RPC URLs

forge test --root contracts        # 41 tests, real fixtures, mock precompile at 0xFD2
forge build --root contracts

# Deploy (deployer needs CTC on CC3 testnet). forge script cannot simulate CC3 headers, so deploy with forge create:
forge create --root contracts src/ScoreEngine.sol:ScoreEngine --rpc-url $CC3_RPC_URL --private-key $PRIVATE_KEY --broadcast --legacy --constructor-args $DEPLOYER_ADDRESS
# … then CreditLedger, CreditBureauASC, CreditPassport, TestUSD, TieredLender in that order (see script/Deploy.s.sol for arguments),
#    grant RECORDER_ROLE to the bureau and NATIVE_RECORDER_ROLE to the lender, and write deployments/cc3-testnet.json.
pnpm --filter @attestcredit/worker abi         # sync ABIs to worker and web

pnpm --filter @attestcredit/worker cli status  # asserts Sepolia chain key == 1, prints latest attested height
pnpm --filter @attestcredit/worker cli seed    # creates REAL Aave history on Sepolia for the wallet in .env
pnpm --filter @attestcredit/worker cli import 0xYourAddress   # scan → batch proofs → executeBatch, prints gas

pnpm --filter @attestcredit/worker server      # proof trail API on :8787
pnpm --filter @attestcredit/web dev            # app on :3000
```

Worker commands: `scan | prove | prove-batch | fixture | submit | submit-batch | import | seed | status`. The app also supports `?as=0x…` on `/app`, `/app/proofs` and `/app/lender` for a read-only view of any subject without a wallet.

## Repository layout

```
contracts/   Foundry. src/: CreditBureauASC, CreditLedger, ScoreEngine, CreditPassport, lib/AaveV3Events, demo/TieredLender, demo/TestUSD
             test/: 41 tests incl. real prover fixtures in test/fixtures/, MockVerifier etched at 0x…0FD2
worker/      TypeScript, ethers v6, @gluwa/usc-sdk 0.18.0: scan, prove, batch, submit, import pipeline, HTTP job API, Aave seed
web/         Next.js 15, wagmi v2, viem, RainbowKit. Design tokens in src/design/tokens.ts shared by landing and app screens
docs/        ATTESTCOIN_INTEGRATION (touchpoints with file:line, gas), SCORING, THREAT_MODEL, ARCHITECTURE, DEMO_SCRIPT, DEVIATIONS
deployments/ cc3-testnet.json (addresses + deployment tx hashes)
deck/        pitch deck source (HTML) and build script
Dockerfile   proof worker image (Railway)
```

## Business model

Submitting proofs stays free and permissionless, the way a bureau accepts data. Reading at scale is the product.

| Stream | Who pays | What for |
|---|---|---|
| **Per-query fees** | Lenders and protocols reading `getScore` at volume | Metered oracle access, the way lenders pay bureaus today; on-chain fee switch on the read path, free tier for small integrators |
| **Premium passports** | Borrowers | Richer attributes, more source chains and protocols (Ethereum mainnet, Compound, Morpho), portable proofs for off-chain lenders |
| **Underwriting feeds** | Ecosystem lenders (Credal, PenguinBase, CTC lending apps) | Batch exports, webhooks on `ProfileUpdated`, cohort analytics |

First market: emerging-market stablecoin borrowers who already use Aave and have no bank-recognised credit file, starting with Nigeria, launched alongside the Creditcoin lender ecosystem so a move from Bronze to Gold unlocks real terms.

## Roadmap

| Phase | Scope |
|---|---|
| **Now (testnet, this repo)** | Aave V3 Sepolia → CC3 testnet. Single and batch proofs, deterministic scoring, soulbound Passport, `ICreditOracle`, TieredLender demo, public bureau lookup, measured gas. |
| **Q4 2026: mainnet readiness** | Ethereum mainnet as source (Attestcoin chain key 3) with the mainnet Aave Pool; price feed for volume instead of fixed scales; audit of `CreditBureauASC` and `CreditLedger`; deployment on Creditcoin mainnet when Attestcoin readability is live there. |
| **Q1 2027: more sources** | Compound v3 and Morpho event decoders (`lib/*Events.sol`), one selector set per protocol; per-reserve minimums and cooldowns in `ScoreEngine` against wash loops; permissionless "importer" incentives so any wallet's history is indexed without the subject acting. |
| **Q2 2027: lender network** | Fee switch on the read path and integrator SDK; Credal and PenguinBase integrations; underwriting feeds and webhooks; passport attributes for off-chain lenders. |
| **Later** | Additional attested chains as Creditcoin adds them; privacy-preserving score proofs so a lender learns the tier without the full history; governance of scoring parameters. |

## Team and license

Built by [big14way](https://github.com/big14way): contracts, Attestcoin integration, worker, app, docs and video.

MIT, see [LICENSE](LICENSE). Testnet only. Scores, passports and TieredLender loans have no monetary value and nothing here is a credit decision.
