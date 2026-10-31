import { describe, it, expect } from 'vitest';
import { buildMuiTheme, muiTheme } from '../theme/mui-theme';
import { tokens } from '../theme/tokens';
import type { ThemeOptions } from '@mui/material/styles';

/**
 * Read a palette slot's `main` color.
 *
 * MUI v9 types a palette slot as `PaletteColorOptions`, which is a
 * UNION of `SimplePaletteColorOptions` (has `main`) and `ColorPartial`
 * (= `Partial<Color>`, which does NOT). So `theme.palette.primary.main`
 * does not typecheck even though the runtime value always has `main` —
 * `buildMuiTheme` always constructs `main` explicitly.
 *
 * Narrowing here keeps the assertion honest and readable without
 * casting the theme itself.
 */
function mainOf(theme: ThemeOptions, slot: 'primary' | 'secondary'): string | undefined {
  const value = theme.palette?.[slot];
  return value && 'main' in value ? (value.main as string) : undefined;
}

/**
 * Read `typography.fontFamily`.
 *
 * Same union issue as `mainOf`: MUI v9 types `typography` as
 * `TypographyVariantsOptions | ((palette: Palette) => TypographyVariantsOptions)`.
 * `buildMuiTheme` always passes the object form.
 */
function fontFamilyOf(theme: ThemeOptions): string | undefined {
  const value = theme.typography;
  return value && typeof value === 'object' && 'fontFamily' in value
    ? (value.fontFamily as string)
    : undefined;
}

describe('tokens', () => {
  it('has gold as default accent', () => {
    expect(tokens.semantic.accent).toBe('#E6B340');
  });

  it('has full color palette', () => {
    expect(tokens.colors.gold).toBe('#E6B340');
    expect(tokens.colors.ink).toBe('#1C1A16');
    expect(tokens.colors.cream).toBe('#F5F0E8');
  });

  it('has typography ramp', () => {
    expect(tokens.typography.ramp).toEqual([12, 14, 15, 16, 18, 22, 24, 32, 48, 64]);
  });
});

describe('buildMuiTheme', () => {
  it('returns valid ThemeOptions', () => {
    const theme = buildMuiTheme('gold');
    expect(mainOf(theme, 'primary')).toBe(tokens.colors.gold);
    expect(mainOf(theme, 'secondary')).toBe(tokens.colors.azure);
    expect(theme.palette?.background?.default).toBe(tokens.semantic.background);
    expect(fontFamilyOf(theme)).toBe(tokens.typography.families.sans);
  });

  it('handles azure accent', () => {
    const theme = buildMuiTheme('azure');
    expect(mainOf(theme, 'primary')).toBe(tokens.colors.azure);
  });

  it('handles red accent', () => {
    const theme = buildMuiTheme('red');
    expect(mainOf(theme, 'primary')).toBe(tokens.colors.red);
  });

  it('defaults to gold when accent is not recognized', () => {
    const theme = buildMuiTheme('unknown');
    expect(mainOf(theme, 'primary')).toBe(tokens.colors.gold);
  });
});

describe('muiTheme', () => {
  it('is a valid MUI theme object', () => {
    expect(muiTheme).toBeDefined();
    expect(mainOf(muiTheme, 'primary')).toBe(tokens.colors.gold);
    expect(fontFamilyOf(muiTheme)).toContain('Sora');
  });
});