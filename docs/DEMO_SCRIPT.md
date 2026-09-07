# Demo video script (≤ 3 minutes, screen recording + voice, no slides)

**0:00 – Landing hero.** "Billions in lending happens on Ethereum. Every wallet's repayment history is trapped there.
AttestCredit proves that history on Creditcoin, with no oracle, no bridge, no indexer, and turns it into a credit
score any lender can read."

**0:20 – Etherscan Sepolia.** Show the demo wallet's Aave V3 Pool transactions: two borrows, five repays.
"This is real Aave activity on Sepolia. Nothing here is mocked."

**0:35 – /app, click Import Aave history.** The proof trail fills in: found → waiting for attestation → proving →
submitting → verified. Point at the attested height, the batch size ("7 transactions, one shared continuity proof"),
and the Creditcoin tx hash. "Creditcoin's attestors saw these blocks. The precompile verified inclusion. Our contract
decoded the receipts and required success, the Pool address, and Sepolia's chain key."

**1:20 – Score jumps.** Breakdown: "Your score is 5xx because: 5 repays, ratio 1.0, recent, tenure…". Passport mints;
open the token image: an SVG rendered entirely on chain.

**1:50 – /lookup/<address>.** "This is what any lender on Creditcoin sees. One call: `getScore(subject)`."

**2:05 – /app/lender.** Offer changes with tier (LTV/APR). Deposit CTC, borrow TUSD, repay. Score ticks up from a
native Creditcoin event, no proof needed.

**2:35 – /docs.** Point at the Attestcoin touchpoint table with file and line references, and the measured gas per tx,
single vs batched.

**2:50 – Close.** "Attestcoin was built to read credit across chains. This is that."
