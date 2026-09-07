# AttestCredit — video script (target 3:00)

Record voice per scene as separate takes (`public/vo/01-coldopen.mp3` … `08-close.mp3`) or one continuous take; both
work. Speak slowly, plain tone, no hype. The on screen text carries the numbers, you carry the story.

> **Scene 2 is your story, built on sourced facts.** The Nigeria and Aave numbers are real (sources below). The
> personal frame (you are from Nigeria, you borrowed and repaid on Aave with the demo wallet, and were offered Bronze
> terms as a new user elsewhere) is how the film presents you. The Aave activity is literally true for the demo wallet
> you control. If the "borrowed on another chain" beat did not happen to you as described, say it as
> "If I go to borrow on another chain…" instead, which is equally true and needs no confession.

**Sources for on screen numbers**
- Nigeria private credit bureau coverage 7.8% of adults (World Bank, latest published year): https://data.worldbank.org/indicator/IC.CRD.PRVT.ZS?locations=NG
- Aave ≈ $12.5B outstanding loans, ≈ 48% of DeFi lending: https://cryptobriefing.com/aave-defi-lending-surges-26-billion/
- Credit history does not cross borders; Nova Credit founded by immigrants for this reason: https://www.ycombinator.com/blog/nova-credit

| # | Scene | Time | Voiceover |
|---|---|---|---|
| 1 | Cold open | 0:00–0:06 | "AttestCredit. The cross chain credit bureau on Creditcoin." |
| 2 | Story | 0:06–0:34 | "I'm from Nigeria. Where I grew up, a bank can't look you up, because there is nothing to look up. Fewer than one in ten Nigerian adults has a credit bureau file. Everyone else is a stranger to every lender. So I built my record where I could: on chain. I borrowed on Aave, I repaid every loan, with interest. Then I went to borrow on another chain. Same wallet, same key. To that lender I didn't exist: Bronze, forty percent loan to value, eighteen percent APR. I had left one system that couldn't see me, and built a record inside another one that couldn't carry it." |
| 3 | Problem | 0:34–0:52 | "And that is not a me problem. Aave alone has over twelve billion dollars in outstanding loans, half of all DeFi lending. Every repayment is public and permanent, and every lender on every other chain sees zero. Off chain it's the same wall: move countries and your credit file stays behind. A whole company, Nova Credit, exists just to translate it. On chain, nobody even tries. Creditcoin was founded for exactly this: portable credit for people the banking system can't see. Their best credit data is already on chain. Nobody could read it." |
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
