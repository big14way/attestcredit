import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CSSProperties, ReactNode } from 'react';
import { T, fluid } from '../theme';

export const Bg = ({ children, style }: { children?: ReactNode; style?: CSSProperties }) => (
  <AbsoluteFill style={{ background: T.bg, color: T.fg, fontFamily: T.font, ...style }}>{children}</AbsoluteFill>
);

/** Heavy fade up with blur, the design system's scroll interpolation, driven by frame. */
export const Rise = ({ children, delay = 0, dur = 24, style, from = 64 }: { children: ReactNode; delay?: number; dur?: number; style?: CSSProperties; from?: number }) => {
  const f = useCurrentFrame();
  const p = fluid(interpolate(f, [delay, delay + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * from}px)`, filter: `blur(${(1 - p) * 12}px)`, ...style }}>
      {children}
    </div>
  );
};

/** Words appear one by one, in reading order, muted → full (B11 tagline behaviour). */
export const Words = ({ text, delay = 0, step = 3, size = 72, color = T.fg, weight = 600, style, muted = 0.3, maxWidth = 1100, lineHeight = 1.08 }: {
  text: string; delay?: number; step?: number; size?: number; color?: string; weight?: number; style?: CSSProperties; muted?: number; maxWidth?: number; lineHeight?: number;
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');
  return (
    <div style={{ fontSize: size, fontWeight: weight, lineHeight, maxWidth, textWrap: 'balance', ...style } as CSSProperties}>
      {words.map((w, i) => {
        const s = spring({ frame: f - delay - i * step, fps, config: { damping: 200, stiffness: 120 } });
        const op = interpolate(s, [0, 1], [muted, 1]);
        const y = interpolate(s, [0, 1], [10, 0]);
        return (
          <span key={i} style={{ display: 'inline-block', color, opacity: op, transform: `translateY(${y}px)`, marginRight: '0.28em' }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const Eyebrow = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <Rise delay={delay} from={20}>
    <div style={{ color: T.accent, fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500 }}>{children}</div>
  </Rise>
);

export const Card = ({ children, style, delay = 0 }: { children: ReactNode; style?: CSSProperties; delay?: number }) => (
  <Rise delay={delay}>
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 24, padding: 32, ...style }}>{children}</div>
  </Rise>
);

/** Number count up with tabular mono digits. */
export const Counter = ({ to, delay = 0, dur = 40, prefix = '', suffix = '', size = 96, color = T.accent, decimals = 0 }: { to: number; delay?: number; dur?: number; prefix?: string; suffix?: string; size?: number; color?: string; decimals?: number }) => {
  const f = useCurrentFrame();
  const p = fluid(interpolate(f, [delay, delay + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const v = to * p;
  return (
    <span style={{ fontFamily: T.mono, fontVariantNumeric: 'tabular-nums', fontSize: size, fontWeight: 600, color }}>
      {prefix}{v.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}
    </span>
  );
};

/** Original mark drawn in with stroke animation. */
export const Mark = ({ size = 120, delay = 0 }: { size?: number; delay?: number }) => {
  const f = useCurrentFrame();
  const p = fluid(interpolate(f, [delay, delay + 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const q = fluid(interpolate(f, [delay + 14, delay + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke={T.accent} strokeWidth="1.6" strokeDasharray={80} strokeDashoffset={80 * (1 - p)} />
      <path d="M7 12.5l3.2 3L17 8.5" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={16} strokeDashoffset={16 * (1 - q)} />
    </svg>
  );
};

export const Pill = ({ children, color = T.fg2, delay = 0 }: { children: ReactNode; color?: string; delay?: number }) => (
  <Rise delay={delay} from={12}>
    <span style={{ display: 'inline-block', border: `1px solid ${color}`, color, borderRadius: 999, padding: '6px 14px', fontSize: 20, fontWeight: 600, fontFamily: T.mono }}>{children}</span>
  </Rise>
);

export const Hash = ({ children, size = 20 }: { children: ReactNode; size?: number }) => (
  <span style={{ fontFamily: T.mono, color: T.fg3, fontSize: size }}>{children}</span>
);

/** Crossfade wrapper for scene enter/exit. */
export const SceneFade = ({ children, out = 12 }: { children: ReactNode; out?: number }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = interpolate(f, [0, 8, durationInFrames - out, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};
