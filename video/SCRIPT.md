# AttestCredit — video script (target 3:00)

Record voice per scene as separate takes (`public/vo/01-coldopen.mp3` … `08-close.mp3`) or one continuous take; both
work. Speak slowly, plain tone, no hype. The on screen text carries the numbers, you carry the story.

> **Scene 2 is written as YOUR story.** Change any detail that is not literally what happened to you (which chain,
> how many loans, what terms you were offered). Do not invent numbers; if you do not remember one, drop it.

| # | Scene | Time | Voiceover |
|---|---|---|---|
| 1 | Cold open | 0:00–0:06 | "AttestCredit. The cross chain credit bureau on Creditcoin." |
| 2 | Story | 0:06–0:34 | "Last year I borrowed on Aave three times. I repaid every loan, on time, with interest. It's all on Ethereum, public, permanent. Then I went to borrow on a different chain. To that lender I was a stranger: Bronze, forty percent loan to value, eighteen percent APR. My history was worth nothing the moment I left the chain it lived on. And that is not a me problem." |
| 3 | Problem | 0:34–0:52 | "Billions of dollars are borrowed and repaid on Aave, Compound and Morpho. Every repayment is public. And every lender on every other chain sees zero. The only bridges today are oracles: someone signs a claim about your history and asks the lender to trust them. Creditcoin was founded to make credit history portable. Its best credit data already lives on chain. Nobody could read it." |
| 4 | Solution | 0:52–1:16 | "AttestCredit proves the history instead of trusting anyone with it. Creditcoin attests Ethereum blocks. A native precompile verifies that your transaction is included in an attested block and hands our contract the receipt bytes. CreditBureauASC checks the chain key, requires the transaction succeeded, requires the log came from the real Aave Pool, rejects replays, then records the fact and recomputes your score on the spot. No oracle. No bridge. No indexer." |
| 5a | Demo: Etherscan | 1:16–1:24 | "This is the demo wallet on Sepolia. Two borrows, five repayments on Aave. Nothing is mocked." |
| 5b | Demo: Import | 1:24–1:50 | "I connect the same wallet on Creditcoin and click Import. The worker finds seven transactions, waits for Creditcoin to attest the block, builds one batch proof with a single continuity proof, and submits. One Creditcoin transaction. Seven verified facts." |
| 5c | Demo: Score & Passport | 1:50–2:02 | "The score moves the moment the proof verifies: five thirty, Silver, and the breakdown tells you exactly why. The Passport is soulbound and its image is rendered on chain from the live ledger." |
| 5d | Demo: Lookup | 2:02–2:12 | "This is what any lender on Creditcoin sees. One call: get score." |
| 5e | Demo: Lender | 2:12–2:26 | "The TieredLender demo reads the oracle at borrow time. Silver gets fifty five percent at twelve. I repay on Creditcoin, and the score ticks up from a native event, no proof needed." |
| 5f | Demo: Docs | 2:26–2:34 | "Every Attestcoin touchpoint is documented with file and line, and gas is measured: five hundred sixty nine thousand for a single proof, three hundred sixty one thousand per transaction batched." |
| 6 | Unique | 2:34–2:50 | "We are not another lending app. We are the credit layer every Creditcoin lender can call. Same key, same address on both chains, so your Ethereum address owns its Creditcoin profile by construction." |
| 7 | Revenue | 2:50–3:04 | "Submitting proofs stays free and permissionless, like a bureau. Reading at scale is the product: per query fees for lenders, premium passports with more source chains, and underwriting feeds for ecosystem lenders. First market: emerging market stablecoin borrowers who already use Aave." |
| 8 | Close | 3:04–3:14 | "Attestcoin was built to read credit across chains. This is that." |

Total spoken ≈ 2:55 at a calm pace. If you run long, trim scene 3 first.
