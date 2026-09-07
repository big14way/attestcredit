/**
 * Design tokens extracted from .claude/skills/landing-page-design/SKILL.md (Part B).
 * The landing page and every /app screen resolve type, spacing, radius, colour and motion through these values.
 */
export const font = {
  family: 'Geist', // one typeface per site; Geist Mono only for hashes, numbers and code
  mono: 'Geist Mono',
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 }, // never 800/900
} as const;

/** Tailwind default type scale — the only sizes allowed. */
export const type = {
  xs: ['0.75rem', '1rem'],
  sm: ['0.875rem', '1.25rem'],
  base: ['1rem', '1.5rem'],
  lg: ['1.125rem', '1.75rem'],
  xl: ['1.25rem', '1.75rem'],
  '2xl': ['1.5rem', '2rem'],
  '3xl': ['1.875rem', '2.25rem'],
  '4xl': ['2.25rem', '2.5rem'],
  '5xl': ['3rem', '1'],
  '6xl': ['3.75rem', '1'],
  '7xl': ['4.5rem', '1'],
} as const;

/** Spacing table (px). Nothing between, nothing outside. */
export const space = {
  0: 0, 25: 2, 50: 4, 75: 8, 100: 12, 200: 16, 300: 24, 400: 32, 500: 40, 600: 48, 700: 64, 800: 80, 900: 96,
} as const;

/** Dark mode backgrounds: only these six. */
export const bg = {
  base: '#000000',
  surface: '#181818',
  raised: '#1F1F1F',
  overlay: '#272727',
  border: '#313131',
  warm: '#131209',
} as const;

export const text = {
  primary: '#FFFFFF',
  secondary: '#9B9B9B', // hero gradient end
  muted: '#6B6B6B',
} as const;

/** Single accent (Creditcoin palette family: dark ground, one mint accent). */
export const accent = {
  DEFAULT: '#8AF0C8',
  strong: '#5FE3B0',
  ink: '#062A1E', // text on accent
} as const;

/** Tier colours shared with CreditPassport.tierColor(). */
export const tier = {
  0: { name: 'Bronze', color: '#B87333' },
  1: { name: 'Silver', color: '#A8B3C4' },
  2: { name: 'Gold', color: '#F2B632' },
  3: { name: 'Platinum', color: '#7EE0D6' },
} as const;

/** Motion: real world mass and spring physics. Never default transitions. */
export const motion = {
  ease: 'cubic-bezier(0.32,0.72,0,1)',
  duration: 700, // ms
  reveal: 800, // scroll interpolation fade up
} as const;

export const maxWidth = { hero: 680 } as const;
