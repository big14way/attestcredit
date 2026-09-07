# AttestCredit

**The cross-chain credit bureau on Creditcoin, powered by the Attestcoin Protocol.**

Creditcoin's founding mission is portable, verifiable credit history for people the banking system cannot see. Billions of dollars of lending activity already happens on Ethereum — Aave, Compound, Morpho — but every wallet's repayment history is trapped there, unreadable by any lender on any other chain. AttestCredit uses the Attestcoin Protocol to *prove* a wallet's Aave borrow, repay, and liquidation transactions inside a Creditcoin smart contract, with no oracle operator, no bridge, and no trusted indexer. From those proven facts it builds an on-chain credit profile, computes a deterministic score, and mints a non-transferable Credit Passport that any lender on Creditcoin can read through one interface. We are not another lending app. We are the credit infrastructure every Creditcoin lending app needs — and the first project that uses Attestcoin for exactly what it was designed for: reading real financial behaviour from another chain, trustlessly.

| | |
|---|---|
| Demo video | _coming with the submission_ |
| Live app | _coming with the submission_ |
| Docs | [`docs/ATTESTCOIN_INTEGRATION.md`](docs/ATTESTCOIN_INTEGRATION.md) · [`docs/SCORING.md`](docs/SCORING.md) · [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Network | Creditcoin CC3 testnet (chainId 102031) ← Ethereum Sepolia (Attestcoin chain key 1) |

## Architecture

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
                                                                                CreditPassport (ERC-721 soulbound, SVG)
                                                                                TieredLender (demo consumer)
Frontend (Next.js) ◀──── reads profiles/passport via viem; calls worker API for import; shows proof trail
```

## Identity

Creditcoin CC3 is EVM. **The same private key controls the same address on Sepolia and on Creditcoin.** An Ethereum
address's credit profile is therefore *owned* on Creditcoin by that same address: no signature bridging, no oracle.
Anyone may submit proofs for any subject (permissionless indexing, like a bureau), but only the subject itself can
mint its Passport, and only the subject sees "my" views in the app. The credit subject of each fact is taken from
the Aave event topics (`onBehalfOf` for Borrow, `user` for Repay and LiquidationCall), never from the caller.

## Quickstart

```bash
pnpm install                      # workspace: contracts, worker, web
cp .env.example .env              # fill PRIVATE_KEY (CC3 + Sepolia), RPC URLs
forge test --root contracts       # 41 tests, real Sepolia proof fixtures, mock precompile at 0xFD2
forge build --root contracts

# deploy to CC3 testnet (deployer needs CTC; writes deployments/cc3-testnet.json)
cd contracts && forge script script/Deploy.s.sol --rpc-url $CC3_RPC_URL --broadcast && cd ..
pnpm --filter @attestcredit/worker abi           # sync ABIs to worker + web

pnpm --filter @attestcredit/worker cli status    # asserts Sepolia chainKey == 1, prints latest attested height
pnpm --filter @attestcredit/worker cli seed      # creates REAL Aave history on Sepolia for the demo wallet
pnpm --filter @attestcredit/worker cli import 0xYourAddress   # scan → batch proofs → CreditBureauASC.executeBatch

pnpm --filter @attestcredit/worker server        # http://localhost:8787 (proof trail API for the web app)
pnpm --filter @attestcredit/web dev              # http://localhost:3000
```

Worker commands: `scan | prove | prove-batch | fixture | submit | submit-batch | import | seed | status`.

## Integrate in 5 minutes

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICreditOracle {
    function getScore(address subject) external view returns (uint16 score, uint8 tier); // 300–850, 0..3
    function factCount(address subject) external view returns (uint256);
}

contract MyLender {
    ICreditOracle public constant BUREAU = ICreditOracle(0x0000000000000000000000000000000000000000); // CreditLedger, see below

    function ltvBps(address user) public view returns (uint16) {
        (, uint8 tier) = BUREAU.getScore(user);
        if (tier == 3) return 8000; // Platinum
        if (tier == 2) return 7000; // Gold
        if (tier == 1) return 5500; // Silver
        return 4000;                // Bronze
    }
}
```

Tiers: `<500 Bronze · 500–649 Silver · 650–749 Gold · ≥750 Platinum`. Formula in [`docs/SCORING.md`](docs/SCORING.md).

## Deployed addresses (CC3 testnet)

_Filled by `script/Deploy.s.sol` into [`deployments/cc3-testnet.json`](deployments/cc3-testnet.json)._

| Contract | Address |
|---|---|
| ScoreEngine | _pending_ |
| CreditLedger (ICreditOracle) | _pending_ |
| CreditBureauASC | _pending_ |
| CreditPassport | _pending_ |
| TestUSD | _pending_ |
| TieredLender | _pending_ |

Verification transactions are listed in [`docs/ATTESTCOIN_INTEGRATION.md`](docs/ATTESTCOIN_INTEGRATION.md).

## Repository

```
contracts/   Foundry: CreditBureauASC, CreditLedger, ScoreEngine, CreditPassport, TieredLender, tests + real fixtures
worker/      TypeScript (ethers v6, @gluwa/usc-sdk): scan, prove, batch, submit, import, seed, HTTP API
web/         Next.js 15, wagmi v2 + viem, RainbowKit; landing page + app + public bureau lookup
docs/        integration, scoring, threat model, architecture, demo script, deviations
deck/        pitch deck source
```

## Team

Built by [big14way](https://github.com/big14way) for BUIDL CTC 2026 Fall (Creditcoin & Credit Labs).

## License

MIT — see [LICENSE](LICENSE).
