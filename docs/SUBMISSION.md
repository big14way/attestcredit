# DoraHacks submission fields

**Project name:** AttestCredit

**One-liner:** The cross-chain credit bureau on Creditcoin, powered by the Attestcoin Protocol.

**Sector:** DeFi (secondary: RWA)

**Links**
- Repo: https://github.com/big14way/attestcredit
- Live app: https://attestcredit.vercel.app
- Demo video (3 min): https://youtu.be/s8GyOREF75E
- Deck: `deck/attestcredit-deck.pdf` (built from `deck/index.html` with `deck/build.sh`)
- Testnet addresses: README → "Deployed contracts (CC3 testnet)"; `deployments/cc3-testnet.json`

**Attestcoin integration summary (150 words)**

AttestCredit is a readability ASC that turns a wallet's Aave V3 activity on Ethereum Sepolia into a credit score on Creditcoin without an oracle, bridge or indexer. The worker asserts Sepolia's chain key (1) from the ChainInfo precompile, waits for attestation with the proof builder's `waitUntilHeightAttested`, and builds single or batch proofs (`getProof`, `getBatchProof`, up to ten transactions per shared continuity proof). `CreditBureauASC`, inheriting `ASCBase`, calls the BlockProver precompile's `verifyAndEmit` (single and batch), derives replay keys from `calculateTxIndex`, decodes receipts with `EvmV1Decoder`, requires `receiptStatus == 1`, filters logs with `getLogsByEventSignature`, and accepts only logs emitted by the real Aave Pool. Facts are recorded in `CreditLedger`, whose clock is the latest attested Sepolia height from the ChainInfo precompile. Measured on CC3: 361,150 gas per transaction batched versus 568,788 single. Every touchpoint is documented with file and line in `docs/ATTESTCOIN_INTEGRATION.md`.

**Tagline for the card:** Your Aave repayment history, proven on Creditcoin.
