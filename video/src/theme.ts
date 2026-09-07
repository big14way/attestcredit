// Same tokens as web/src/design/tokens.ts so the video reads as the product.
export const T = {
  bg: '#000000', surface: '#181818', raised: '#1F1F1F', overlay: '#272727', line: '#313131', warm: '#131209',
  fg: '#FFFFFF', fg2: '#9B9B9B', fg3: '#6B6B6B',
  accent: '#8AF0C8', accentStrong: '#5FE3B0', ink: '#062A1E',
  bronze: '#B87333', silver: '#A8B3C4', gold: '#F2B632', platinum: '#7EE0D6',
  font: 'Geist, ui-sans-serif, system-ui, sans-serif',
  mono: '"Geist Mono", ui-monospace, Menlo, monospace',
} as const;

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const sec = (s: number) => Math.round(s * FPS);

/** Fluid easing from the design system, cubic-bezier(0.32,0.72,0,1). */
export const fluid = (t: number) => {
  // cubic bezier approximation via De Casteljau on x to find t, then y
  const p1x = 0.32, p1y = 0.72, p2x = 0, p2y = 1;
  const bx = (u: number) => 3 * (1 - u) ** 2 * u * p1x + 3 * (1 - u) * u ** 2 * p2x + u ** 3;
  const by = (u: number) => 3 * (1 - u) ** 2 * u * p1y + 3 * (1 - u) * u ** 2 * p2y + u ** 3;
  let lo = 0, hi = 1, u = t;
  for (let i = 0; i < 24; i++) { u = (lo + hi) / 2; if (bx(u) < t) lo = u; else hi = u; }
  return by(u);
};
