'use client';
import { CheckCircle, CircleNotch, Clock, WarningCircle, Cube, ArrowRight } from '@phosphor-icons/react';
import type { TxTrail } from '@/lib/worker';
import { explorer } from '@/lib/chains';
import { short } from '@/lib/format';
import { HashLink, Pill } from './ui';

const stageLabel: Record<TxTrail['stage'], string> = {
  found: 'Found on Sepolia',
  skipped: 'Already verified',
  waiting_attestation: 'Waiting for Creditcoin attestation',
  proving: 'Attested · building proof',
  submitting: 'Submitting to CreditBureauASC',
  verified: 'Verified on Creditcoin',
  failed: 'Failed',
};

function StageIcon({ s }: { s: TxTrail['stage'] }) {
  if (s === 'verified' || s === 'skipped') return <CheckCircle size={20} weight="fill" className="text-accent" />;
  if (s === 'failed') return <WarningCircle size={20} weight="fill" className="text-bronze" />;
  if (s === 'found') return <Cube size={20} className="text-fg-2" />;
  if (s === 'waiting_attestation') return <Clock size={20} className="text-fg-2" />;
  return <CircleNotch size={20} className="animate-spin text-accent" />;
}

/** Sepolia tx → attested height → Creditcoin tx → decoded event → profile delta. Every hash is a link. */
export function ProofTrail({ trails }: { trails: TxTrail[] }) {
  if (trails.length === 0) return null;
  return (
    <ol className="space-y-3">
      {trails.map((t) => (
        <li key={t.txHash} className="fluid rounded-xl border border-line bg-raised p-4">
          <div className="flex flex-wrap items-center gap-3">
            <StageIcon s={t.stage} />
            <span className="text-sm font-semibold">{stageLabel[t.stage]}</span>
            {t.events.map((e) => <Pill key={e} color="#8AF0C8">{e}</Pill>)}
            {t.batchId !== undefined && <Pill>batch {t.batchId + 1}</Pill>}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-fg-2 md:grid-cols-2">
            <div>Sepolia tx <HashLink href={explorer.sepoliaTx(t.txHash)} label={short(t.txHash, 8)} /> · block <HashLink href={explorer.sepoliaBlock(t.block)} label={String(t.block)} /></div>
            {t.attestedHeight !== undefined && <div>Latest attested height <span className="font-mono text-fg">{t.attestedHeight}</span>{t.continuityRoots !== undefined && <> · <span className="font-mono text-fg">{t.continuityRoots}</span> continuity roots</>}</div>}
            {t.queryId && <div>queryId <span className="font-mono text-xs text-fg">{short(t.queryId, 10)}</span></div>}
            {t.creditcoinTx && <div className="flex items-center gap-1">Creditcoin tx <ArrowRight size={12} /> <HashLink href={explorer.cc3Tx(t.creditcoinTx)} label={short(t.creditcoinTx, 8)} />{t.gasUsed && <span className="text-fg-3"> · gas {Number(t.gasUsed).toLocaleString()}</span>}</div>}
            {t.error && <div className="text-bronze md:col-span-2">{t.error}</div>}
          </div>
          {t.facts && t.facts.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {t.facts.map((f) => (
                <li key={f.factId} className="rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs">
                  {['', 'Borrow', 'Repay', 'Liquidation'][f.factType]} · {(Number(f.amountUsd6) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD eq
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
