'use client';
import { useStats } from '@/hooks/useProfile';
import { isDeployed } from '@/lib/contracts';

/** Sepolia → Attestcoin → Creditcoin with packets in flight and the live attested height. Pure CSS motion. */
export function PipelineStrip() {
  const s = useStats();
  const nodes = [
    ['Ethereum Sepolia', 'Aave V3 Pool'],
    ['Attestcoin', 'attest · prove'],
    ['Creditcoin CC3', 'CreditBureauASC'],
  ];
  return (
    <div className="relative rounded-2xl border border-line bg-surface p-4">
      <div className="relative flex items-center justify-between gap-2">
        {nodes.map(([t, sub], i) => (
          <div key={t} className={`relative z-10 rounded-xl border px-3 py-2 text-center ${i === 1 ? 'border-accent/60 bg-raised' : 'border-line bg-raised'}`}>
            <div className="text-sm font-semibold">{t}</div>
            <div className="font-mono text-xs text-fg-3">{sub}</div>
          </div>
        ))}
        <svg className="absolute inset-x-0 top-1/2 -z-0 h-2 w-full -translate-y-1/2" viewBox="0 0 1000 8" preserveAspectRatio="none" aria-hidden>
          <line x1="0" y1="4" x2="1000" y2="4" stroke="#313131" strokeWidth="2" />
        </svg>
        {[0, 0.9, 1.9].map((d) => (
          <span key={d} className="packet absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-accent" style={{ animationDelay: `${d}s`, offsetPath: "path('M 0 0 L 100% 0')" }} aria-hidden />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-fg-2">
        <span className="live-dot inline-block h-2 w-2 rounded-full bg-accent" />
        {isDeployed && s.attestedBlock ? (
          <span>Sepolia block <span className="font-mono text-fg">{s.attestedBlock.toLocaleString()}</span> attested on Creditcoin · {s.proofs?.toString() ?? '–'} txs verified</span>
        ) : (
          <span>Reading Creditcoin CC3 testnet…</span>
        )}
      </div>
    </div>
  );
}
