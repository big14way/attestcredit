'use client';
import { useEffect, useRef, useState } from 'react';

/** Counts up from 0 when it enters the viewport; re-eases to any new value (live stats). */
export function CountUp({ value, className = '' }: { value?: bigint | number; className?: string }) {
  const target = value === undefined ? undefined : Number(value);
  const [shown, setShown] = useState(0);
  const [seen, setSeen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen || target === undefined) return;
    const from = shown, start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1100);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (target - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, target]);
  return <span ref={ref} className={`tabular-nums ${className}`}>{target === undefined ? '–' : shown.toLocaleString()}</span>;
}
