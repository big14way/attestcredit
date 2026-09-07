import type { Breakdown as B } from '@/hooks/useProfile';
import { Skeleton } from './ui';

const rows: Array<[keyof B, string, string]> = [
  ['base', 'Base', 'every profile starts at 300'],
  ['repayPts', 'Repayments', 'min(repays, 40) × 6'],
  ['volumePts', 'Repaid volume', 'bit length of USD repaid, capped 12, × 8'],
  ['ratioPts', 'Repay to borrow ratio', 'repaid ÷ borrowed, clamped to 1.0, × 80'],
  ['tenurePts', 'Tenure', 'weeks since first proven fact, capped 24, × 4'],
  ['recencyPts', 'Recency', 'repaid within 30 days: 40, within 90: 20'],
  ['nativePts', 'Creditcoin repayments', 'min(native repays, 10) × 5'],
  ['liquidationPenalty', 'Liquidations', '90 first, 45 each more, +60 if recent'],
  ['defaultPenalty', 'Defaults on Creditcoin', '120 each'],
];

/** "Your score is 712 because…" — every row is read from CreditLedger.getBreakdown, nothing is computed here. */
export function BreakdownTable({ b, loading }: { b?: B; loading?: boolean }) {
  if (loading) {
    return <div className="space-y-2">{rows.map((r) => <Skeleton key={r[0]} className="h-8 w-full" />)}</div>;
  }
  if (!b) return <p className="text-sm text-fg-2">No breakdown available.</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([k, label, how]) => {
          const v = Number(b[k]);
          const neg = k.endsWith('Penalty');
          return (
            <tr key={k} className="border-b border-line last:border-0">
              <td className="py-2 pr-4">
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-fg-3">{how}</div>
              </td>
              <td className={`py-2 text-right font-mono tabular-nums ${neg ? (v ? 'text-bronze' : 'text-fg-3') : v ? 'text-accent' : 'text-fg-3'}`}>
                {neg ? (v ? `−${v}` : '0') : `+${v}`}
              </td>
            </tr>
          );
        })}
        <tr>
          <td className="pt-3 font-semibold">Score</td>
          <td className="pt-3 text-right font-mono text-lg font-semibold tabular-nums">{Number(b.score)}</td>
        </tr>
      </tbody>
    </table>
  );
}
