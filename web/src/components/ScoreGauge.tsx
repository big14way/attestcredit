'use client';
import { useEffect, useState } from 'react';
import { tierColor, tierName } from '@/lib/format';

/** 300–850 arc gauge. The number eases toward the live on chain score (fluid bezier, 700ms). */
export function ScoreGauge({ score, tier, pulse = 0, size = 260 }: { score?: number; tier?: number; pulse?: number; size?: number }) {
  const [shown, setShown] = useState(score ?? 300);
  useEffect(() => {
    if (score === undefined) return;
    const from = shown, to = score, start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const pct = Math.max(0, Math.min(1, (shown - 300) / 550));
  const r = size / 2 - 14, c = size / 2;
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  const arc = (from: number, to: number) => {
    const x = (a: number) => c + r * Math.cos(a), y = (a: number) => c + r * Math.sin(a);
    const large = to - from > Math.PI ? 1 : 0;
    return `M ${x(from)} ${y(from)} A ${r} ${r} 0 ${large} 1 ${x(to)} ${y(to)}`;
  };
  const color = tier === undefined ? '#313131' : tierColor(tier);
  return (
    <figure className={`relative mx-auto ${pulse ? 'animate-[pulse_1s_ease-out_1]' : ''}`} style={{ width: size, height: size }} aria-label={`Credit score ${score ?? 'unknown'}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={arc(a0, a1)} stroke="#272727" strokeWidth={12} fill="none" strokeLinecap="round" />
        <path d={arc(a0, a0 + (a1 - a0) * pct)} stroke={color} strokeWidth={12} fill="none" strokeLinecap="round" className="fluid" />
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-6xl font-semibold tabular-nums" style={{ color }}>{score === undefined ? '–' : shown}</span>
        <span className="mt-2 text-sm font-semibold" style={{ color }}>{tier === undefined ? 'No history yet' : tierName(tier)}</span>
        <span className="mt-1 text-xs text-fg-3">300 – 850</span>
      </figcaption>
    </figure>
  );
}
