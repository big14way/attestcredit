import type { Fact } from '@/hooks/useProfile';
import { explorer } from '@/lib/chains';
import { amountOf, reserveSymbol, short, usd6, ago } from '@/lib/format';
import { FACT_TYPE } from '@/lib/contracts';
import { HashLink, Pill, Skeleton } from './ui';

/** Every fact behind a profile, read from CreditLedger.getFacts. Proven facts link to their Sepolia block. */
export function FactsTable({ facts, loading, cc3TxByQuery }: { facts: Fact[]; loading?: boolean; cc3TxByQuery?: Record<string, string> }) {
  if (loading) return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (facts.length === 0) return <p className="text-sm text-fg-2">No facts recorded yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-xs text-fg-3">
          <tr><th className="pb-2">Type</th><th className="pb-2">Reserve</th><th className="pb-2">Amount</th><th className="pb-2">USD eq</th><th className="pb-2">Sepolia block</th><th className="pb-2">Query id</th><th className="pb-2">Creditcoin tx</th><th className="pb-2">Recorded</th></tr>
        </thead>
        <tbody>
          {[...facts].reverse().map((f, i) => {
            const native = f.factType >= 4;
            const bad = f.factType === 3 || f.factType === 5;
            return (
              <tr key={i} className="border-t border-line">
                <td className="py-2"><Pill color={bad ? '#B87333' : native ? '#A8B3C4' : '#8AF0C8'}>{FACT_TYPE[f.factType]}</Pill></td>
                <td className="py-2 font-mono">{native ? 'TUSD' : reserveSymbol(f.reserve)}</td>
                <td className="py-2 font-mono">{native ? '–' : amountOf(f.reserve, f.amountRaw)}</td>
                <td className="py-2 font-mono">{native ? '–' : usd6(f.amountUsd6)}</td>
                <td className="py-2">{native ? <span className="text-fg-3">Creditcoin native</span> : <HashLink href={explorer.sepoliaBlock(f.sourceBlock)} label={f.sourceBlock.toString()} />}</td>
                <td className="py-2 font-mono text-xs">{native ? '–' : short(f.queryId, 8)}</td>
                <td className="py-2">{cc3TxByQuery?.[f.queryId] ? <HashLink href={explorer.cc3Tx(cc3TxByQuery[f.queryId])} label={short(cc3TxByQuery[f.queryId], 8)} /> : <span className="text-fg-3">–</span>}</td>
                <td className="py-2 text-fg-2">{ago(f.recordedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
