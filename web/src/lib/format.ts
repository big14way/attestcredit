import { formatUnits } from 'viem';
import { RESERVES } from './contracts';

export const short = (h?: string, n = 6) => (h ? `${h.slice(0, n + 2)}…${h.slice(-4)}` : '');

export const usd6 = (v: bigint | number | undefined) =>
  v === undefined ? '–' : `$${Number(formatUnits(BigInt(v), 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export const amountOf = (reserve: string, raw: bigint) => {
  const r = RESERVES[reserve.toLowerCase()];
  if (!r) return `${raw.toString()} (raw)`;
  return `${Number(formatUnits(raw, r.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${r.symbol}`;
};

export const reserveSymbol = (reserve: string) => RESERVES[reserve.toLowerCase()]?.symbol ?? short(reserve);

export const tierName = (t: number) => ['Bronze', 'Silver', 'Gold', 'Platinum'][t] ?? 'Bronze';
export const tierColor = (t: number) => ['#B87333', '#A8B3C4', '#F2B632', '#7EE0D6'][t] ?? '#B87333';

export const ago = (ts: number | bigint) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - Number(ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
