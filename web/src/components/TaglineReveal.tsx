'use client';
import { useEffect, useRef } from 'react';

/** B11: large type tagline; each word activates individually as it crosses a trigger line. */
export function TaglineReveal({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const words = Array.from(root.querySelectorAll<HTMLSpanElement>('.tagline-word'));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-on'); }),
      { rootMargin: '0px 0px -35% 0px', threshold: 1 },
    );
    words.forEach((w, i) => { w.style.transitionDelay = `${(i % 6) * 40}ms`; io.observe(w); });
    return () => io.disconnect();
  }, []);
  return (
    <section aria-label="Tagline" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-[680px]">
        <p className="text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl" style={{ lineHeight: 1.1 }}>
          {lines.map((line, li) => (
            <span key={li} className="block">
              {line.split(' ').map((w, wi) => (
                <span key={`${li}-${wi}`} className="tagline-word">{w}{' '}</span>
              ))}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
