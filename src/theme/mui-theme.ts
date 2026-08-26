/**
 * MUI v9 Theme for DarojaAI.
 *
 * Maps brand tokens (from `src/theme/tokens.ts`) to MUI's `ThemeOptions`.
 * The accent is swappable at runtime via `data-accent` attribute:
 *   gold | azure | green | red
 *
 * Generated projects override the accent by editing this file,
 * not by adding new tokens.
 */

import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { tokens } from './tokens';

/**
 * Accent palette mapping — each accent token maps to a
 * `palette.primary` + `palette.secondary` pair.
 */
const accentPalettes: Record<string, { primary: string; secondary: string }> = {
  gold:   { primary: tokens.colors.gold,   secondary: tokens.colors.azure },
  azure:  { primary: tokens.colors.azure,  secondary: tokens.colors.gold },
  green:  { primary: tokens.colors.green,  secondary: tokens.colors.gold },
  red:    { primary: tokens.colors.red,    secondary: tokens.colors.gold },
};

/**
 * Resolve accent from `data-accent` on `<html>`.
 * Falls back to gold if no attribute is present.
 */
function resolveAccent(): string {
  if (typeof document === 'undefined') return 'gold';
  const attr = document.documentElement.getAttribute('data-accent');
  return attr && attr in accentPalettes ? attr : 'gold';
}

/**
 * Build the MUI theme. Call once at app startup.
 */
export function buildMuiTheme(accent?: string): ThemeOptions {
  const selected = accent ?? resolveAccent();
  const palette = accentPalettes[selected] ?? accentPalettes.gold;

  const themeOptions: ThemeOptions = {
    palette: {
      primary: {
        main: palette.primary,
        contrastText: tokens.colors.ink,
      },
      secondary: {
        main: palette.secondary,
        contrastText: tokens.colors.ink,
      },
      background: {
        default: tokens.semantic.background,
        paper: tokens.semantic.surface,
      },
      text: {
        primary: tokens.semantic.foreground,
        secondary: tokens.colors.gray,
      },
    },
    typography: {
      fontFamily: tokens.typography.families.sans,
      fontSize: 14,
      h1: {
        fontSize: tokens.typography.scale.h1.size,
        fontWeight: tokens.typography.scale.h1.weight,
        lineHeight: tokens.typography.scale.h1.lineHeight,
        letterSpacing: tokens.typography.scale.h1.letterSpacing,
      },
      h2: {
        fontSize: tokens.typography.scale.h2.size,
        fontWeight: tokens.typography.scale.h2.weight,
        lineHeight: tokens.typography.scale.h2.lineHeight,
        letterSpacing: tokens.typography.scale.h2.letterSpacing,
      },
      h3: {
        fontSize: tokens.typography.scale.h3.size,
        fontWeight: tokens.typography.scale.h3.weight,
        lineHeight: tokens.typography.scale.h3.lineHeight,
        letterSpacing: tokens.typography.scale.h3.letterSpacing,
      },
      body1: {
        fontSize: tokens.typography.scale.body.size,
        fontWeight: tokens.typography.scale.body.weight,
        lineHeight: tokens.typography.scale.body.lineHeight,
      },
      body2: {
        fontSize: tokens.typography.scale.lede.size,
        fontWeight: tokens.typography.scale.lede.weight,
        lineHeight: tokens.typography.scale.lede.lineHeight,
      },
    },
    shape: {
      borderRadius: tokens.border.radiusSteps[2], // 8px
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            padding: '14px 22px',
            border: `1px solid ${tokens.semantic.rule2}`,
            borderRadius: 0,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            padding: '28px',
            border: `1px solid ${tokens.semantic.rule}`,
            backgroundColor: `color-mix(in oklab, ${tokens.semantic.background} 75%, white)`,
          },
        },
      },
    },
  };

  return themeOptions;
}

/**
 * Pre-built MUI theme (default accent = gold).
 */
export const muiTheme = createTheme(buildMuiTheme());

/**
 * Theme provider helper — read accent from DOM and build a theme.
 * Use in `src/main.tsx` like:
 *   <ThemeProvider theme={buildMuiTheme()}> ... </ThemeProvider>
 */
export { resolveAccent };