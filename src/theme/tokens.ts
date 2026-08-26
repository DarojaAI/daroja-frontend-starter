/**
 * Brand tokens for DarojaAI frontend projects.
 *
 * Canonical source: `DarojaAI/design-artifacts/tokens.json` and
 * `DarojaAI/design-artifacts/brands/daroja.json`.
 *
 * Values are extracted at build time and should be kept in sync with
 * the design-artifacts repo. When the org publishes a shared package,
 * replace this file with a direct import from that package.
 *
 * See also: `src/theme/mui-theme.ts` for the MUI v9 mapping.
 */

export const tokens = {
  colors: {
    gold: '#E6B340',
    red: '#B34A35',
    azure: '#3299BB',
    green: '#708238',
    gray: '#636C70',
    cream: '#F5F0E8',
    cream2: '#EDE6D8',
    ink: '#1C1A16',
  },
  semantic: {
    accent: '#E6B340',     // --accent (gold)
    background: '#F5F0E8', // --cream
    surface: '#EDE6D8',    // --cream-2
    foreground: '#1C1A16', // --ink
    muted: 'rgba(28,26,22,.55)',
    rule: 'rgba(28,26,22,.10)',
    rule2: 'rgba(28,26,22,.18)',
  },
  typography: {
    families: {
      sans: 'Sora, sans-serif',
      mono: 'JetBrains Mono, ui-monospace, monospace',
    },
    scale: {
      h1:  { size: 'clamp(48px, 7.5vw, 112px)', weight: 200, lineHeight: 0.96,  letterSpacing: '-0.02em' },
      h2:  { size: 'clamp(32px, 4vw, 56px)',    weight: 200, lineHeight: 1.05,  letterSpacing: '-0.015em' },
      h3:  { size: 'clamp(22px, 2vw, 28px)',    weight: 300, lineHeight: 1.2,   letterSpacing: '-0.005em' },
      body: { size: '15px',                      weight: 300, lineHeight: 1.6 },
      lede: { size: 'clamp(17px, 1.6vw, 22px)', weight: 300, lineHeight: 1.5 },
      eyebrow: { size: '11px', weight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' as const },
      stat: { size: 'clamp(48px, 6vw, 88px)',   weight: 200, lineHeight: 1,    letterSpacing: '-0.03em' },
    },
    ramp: [12, 14, 15, 16, 18, 22, 24, 32, 48, 64],
  },
  layout: {
    container: '1280px',
    padX: 'clamp(24px, 5vw, 80px)',
  },
  border: {
    radiusSteps: [0, 4, 8, 12, 24],
    widthSteps: [0, 1, 1.5, 2],
  },
} as const;

export type TokenColors = typeof tokens.colors;
export type TokenSemantic = typeof tokens.semantic;