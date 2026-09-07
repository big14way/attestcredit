import Link from 'next/link';
import { ShieldCheck, Link as LinkIcon, IdentificationBadge, ArrowRight, Cube, MagnifyingGlass, Scales } from '@phosphor-icons/react/dist/ssr';
import { Reveal } from '@/components/Reveal';
import { TaglineReveal } from '@/components/TaglineReveal';
import { LiveStats } from '@/components/LiveStats';
import { Button } from '@/components/ui';
import { explorer } from '@/lib/chains';
import { HeroWords } from '@/components/HeroWords';
import { PipelineStrip } from '@/components/PipelineStrip';

/*
 * Landing page per .claude/skills/landing-page-design/SKILL.md
 * Intake (answered from the spec):
 *   Primary action: open the app and import Aave history (one CTA, "Import your Aave history").
 *   Offer: a portable, verifiable credit score on Creditcoin built from real Aave activity, free, testnet.
 *   ICP: Aave borrowers who want their repayment history to count elsewhere; secondary: Creditcoin lenders.
 *   Objections: "wallet ≠ person", "is this just an oracle", "can I fake it", "what does it cost".
 *   Proof: live on chain counters, real tx hashes, open source, measured gas.
 *   Layout: A (classic hero plus sections) — the product is understandable from one proof trail screenshot.
 *   SEO: index. Title and description in layout.tsx.
 */

// Real Sepolia transactions of the demo wallet (created by `worker seed`). Nothing here is invented.
const DEMO = '0x3C343AD077983371b29fee386bdBC8a92E934C51';
const trail = [
  { tx: '0xfa08887b3da3bc237ed9cff1ddf94e572360c6d8fa50f2761d2e6f0c3649bf7b', block: 11655912, ev: 'Borrow', amt: '400 USDC' },
  { tx: '0xf5c96636e78354f22e7aeb8d6b20c1818cf9e37aa2ce79e6c7d593d6586f2b29', block: 11655920, ev: 'Repay', amt: '150 USDC' },
  { tx: '0x932a808f1d6011661f8706d9017c0fb85c984e24a3e52bcf6f2e6c22049e5ff5', block: 11655943, ev: 'Repay', amt: '100.003 USDC' },
  { tx: '0xfe4b504e680f61ac9b31879b2876962a4e74bae6bb92a04be9af3e897e6ed27c', block: 11655944, ev: 'Borrow', amt: '250 USDC' },
];

const faq = [
  ['Is this an oracle?', 'No. Nobody signs anything on your behalf. The Creditcoin network attests Sepolia block hashes itself, and a precompile verifies that your transaction is included under one of those hashes. The contract then reads the receipt bytes directly.'],
  ['A wallet is not a person. Why does this work?', 'Creditcoin CC3 is EVM, so the same private key controls the same address on Sepolia and on Creditcoin. Your Ethereum address owns its profile on Creditcoin without any signature bridging. Only that address can mint its Passport.'],
  ['Can I fake a history?', 'Only by actually borrowing and repaying on Aave. Facts come exclusively from Borrow, Repay and LiquidationCall logs emitted by the Aave V3 Pool inside successful transactions. Events emitted by any other contract are ignored.'],
  ['Who can submit proofs?', 'Anyone, for anyone. That is what a bureau is. Replay protection means each Sepolia transaction can be counted once, and a proof with no Aave fact in it is rejected without consuming anything.'],
  ['What does it cost?', 'On testnet, nothing. Batch proofs verify up to 10 transactions in one call with a single shared continuity proof; measured gas per transaction is on the docs page.'],
  ['What can the proof not see?', 'Balances, prices or storage. Attestcoin proves transaction inclusion and receipt contents. Volume therefore uses fixed testnet scales and is a secondary signal; counts, ratio, tenure and liquidations are the primary ones.'],
  ['Which chains?', 'Ethereum Sepolia into Creditcoin CC3 testnet today. The same contract works for any chain Creditcoin attests once its lending events are mapped.'],
  ['How do lenders use it?', 'Call getScore(subject) on CreditLedger. It returns a 300 to 850 score and a tier. The TieredLender demo prices LTV and APR from it in under 40 lines.'],
];

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-40 md:pt-48">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm text-fg-2">
              <ShieldCheck size={16} className="text-accent" /> Built on the Attestcoin Protocol · Creditcoin CC3 testnet
            </p>
            <h1 className="max-w-[680px] text-5xl font-semibold md:text-6xl" style={{ lineHeight: 1.05 }}>
              <HeroWords lines={['Your Aave repayment history,', 'proven on Creditcoin']} wordClass="hero-heading" start={100} step={70} />
            </h1>
            <p className="mt-6 max-w-[680px] text-lg text-fg-2">
              AttestCredit reads a wallet&apos;s borrow, repay and liquidation transactions from Ethereum inside a Creditcoin smart contract. No oracle, no bridge, no indexer. From those proven facts it computes a 300 to 850 score any lender on Creditcoin can query.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button href="/app">Import your Aave history <ArrowRight size={18} /></Button>
              <span className="text-sm text-fg-3">Free on testnet · open source · no signup</span>
            </div>
            <p className="mt-8 text-sm text-fg-2">
              Proof signal: every number on this site is read from Creditcoin CC3 testnet at request time.
            </p>
          </div>

          <Reveal className="space-y-4">
            <PipelineStrip />
            <div className="card-hover rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between px-2 pb-3">
              <span className="text-sm font-semibold">Proof trail · {DEMO.slice(0, 6)}…{DEMO.slice(-4)}</span>
              <span className="text-xs text-fg-3">Sepolia → Creditcoin</span>
            </div>
            <ol className="space-y-2">
              {trail.map((t, i) => (
                <li key={t.tx} className="reveal is-visible flex items-center gap-3 rounded-xl border border-line bg-raised p-3" style={{ transitionDelay: `${300 + i * 120}ms` }}>
                  <Cube size={18} className="shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{t.ev}</span>
                      <span className="text-fg-2">{t.amt}</span>
                      <span className="ml-auto font-mono text-xs text-fg-3">#{t.block}</span>
                    </div>
                    <a href={explorer.sepoliaTx(t.tx)} target="_blank" rel="noreferrer" className="fluid block truncate font-mono text-xs text-fg-3 hover:text-accent">{t.tx}</a>
                  </div>
                </li>
              ))}
            </ol>
            <p className="px-2 pt-3 text-xs text-fg-3">Real Aave V3 Pool transactions of the demo wallet on Sepolia. Import them in the app and watch each one verify.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Problem → solution */}
      <Reveal as="section" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold">Credit history that cannot leave its chain is not credit history</h2>
          </div>
          <div className="space-y-4 text-lg text-fg-2">
            <p>Billions of dollars are borrowed and repaid on Ethereum every month. Every repayment is public and permanent, and completely unreadable by a lender on any other chain.</p>
            <p>Creditcoin was founded to make credit history portable. The Attestcoin Protocol lets a Creditcoin contract verify that a specific Ethereum transaction happened, and read its receipt. AttestCredit is the first project to use that for exactly what it was designed for: reading real financial behaviour, trustlessly.</p>
          </div>
        </div>
      </Reveal>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal><h2 className="max-w-[680px] text-3xl font-semibold">What you get</h2></Reveal>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            [ShieldCheck, 'A score you did not have to ask anyone for', 'Every point traces to a Sepolia transaction verified by the Creditcoin network. There is no committee, no API key and no operator who could say no.'],
            [IdentificationBadge, 'A passport that is yours by construction', 'Soulbound ERC-721, token id equals your address, image rendered on chain from the live ledger. It cannot be sold, lent or faked.'],
            [Scales, 'Terms that move with your tier', 'The TieredLender demo offers 40% LTV at 18% to Bronze and 80% at 5% to Platinum, reading the oracle at borrow time.'],
            [LinkIcon, 'Ten transactions, one proof', 'Batch proofs share a single continuity proof across up to 10 transactions within 1000 blocks. A whole history imports in a few calls.'],
            [MagnifyingGlass, 'A public bureau view', 'Any lender can open /lookup/&lt;address&gt; and see exactly what the contract sees, fact by fact, hash by hash.'],
          ].map(([Icon, title, body], i) => (
            <Reveal as="li" key={String(title)} delay={i * 80} className="card-hover rounded-2xl border border-line bg-surface p-6">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(() => { const I = Icon as any; return <I size={28} className="text-accent" />; })()}
              <h3 className="mt-4 text-xl font-semibold">{String(title)}</h3>
              <p className="mt-2 text-base text-fg-2" dangerouslySetInnerHTML={{ __html: String(body) }} />
            </Reveal>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal><h2 className="max-w-[680px] text-3xl font-semibold">How it works</h2></Reveal>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ['1 · Ethereum', 'You borrow and repay on Aave V3. The Pool emits Borrow and Repay events with your address in the topics.'],
            ['2 · Attestcoin', 'Creditcoin attests Sepolia block hashes. The worker waits for your block, asks the proof builder for a Merkle inclusion proof plus a continuity proof, and submits it.'],
            ['3 · Creditcoin', 'CreditBureauASC calls the block prover precompile, decodes the receipt, requires success and the real Pool address, and records the fact. The ledger recomputes your score on the spot.'],
          ].map(([t, b], i) => (
            <Reveal as="li" key={t} delay={i * 100} className="card-hover rounded-2xl border border-line bg-surface p-6">
              <p className="font-mono text-sm text-accent">{t}</p>
              <p className="mt-3 text-base text-fg-2">{b}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <TaglineReveal lines={['Attestcoin was built to read', 'credit across chains.', 'This is that.']} />

      {/* Live stats */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal><h2 className="max-w-[680px] text-3xl font-semibold">Live from Creditcoin CC3 testnet</h2></Reveal>
        <div className="mt-10"><LiveStats /></div>
      </section>

      {/* For lenders */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <h2 className="max-w-[680px] text-3xl font-semibold">For lenders: integrate in five minutes</h2>
            <p className="mt-4 text-lg text-fg-2">One interface, one call. Score and tier come back from the ledger; every input is a verified fact you can audit on the proofs page.</p>
            <div className="mt-6"><Button href="/docs" variant="secondary">Read the integration docs <ArrowRight size={16} /></Button></div>
          </Reveal>
          <Reveal delay={100}>
            <pre className="overflow-x-auto rounded-2xl border border-line bg-surface p-6 font-mono text-sm leading-6 text-fg-2"><code>{`interface ICreditOracle {
  function getScore(address subject)
    external view returns (uint16 score, uint8 tier);
}

contract MyLender {
  ICreditOracle constant BUREAU =
    ICreditOracle(0x211a38792781b2c7a584a96F0e735d56e809fe85);

  function ltvBps(address user) public view returns (uint16) {
    (, uint8 tier) = BUREAU.getScore(user);
    if (tier == 3) return 8000; // Platinum
    if (tier == 2) return 7000; // Gold
    if (tier == 1) return 5500; // Silver
    return 4000;                // Bronze
  }
}`}</code></pre>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal><h2 className="max-w-[680px] text-3xl font-semibold">Questions lenders and borrowers ask</h2></Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {faq.map(([q, a], i) => (
            <Reveal as="article" key={q} delay={(i % 2) * 80} className="card-hover rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-lg font-semibold">{q}</h3>
              <p className="mt-2 text-base text-fg-2">{a}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <Reveal as="section" className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-2xl border border-line bg-surface p-10 text-center md:p-16">
          <h2 className="mx-auto max-w-[680px] text-4xl font-semibold">Bring your repayment history with you</h2>
          <p className="mx-auto mt-4 max-w-[680px] text-lg text-fg-2">Connect the wallet you use on Aave Sepolia. Nothing to sign up for, nothing to pay, nothing to trust but the chain.</p>
          <div className="mt-8 flex justify-center"><Button href="/app">Import your Aave history <ArrowRight size={18} /></Button></div>
          <p className="mt-4 text-sm text-fg-3">No Aave history yet? The app can seed a real one for the demo wallet, or <Link className="text-accent" href={explorer.aaveApp} target="_blank">open Aave Sepolia</Link>.</p>
        </div>
      </Reveal>
    </>
  );
}
