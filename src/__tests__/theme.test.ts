import { describe, it, expect } from 'vitest';
import { buildMuiTheme, muiTheme } from '../theme/mui-theme';
import { tokens } from '../theme/tokens';

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
    expect(theme.palette?.primary?.main).toBe(tokens.colors.gold);
    expect(theme.palette?.secondary?.main).toBe(tokens.colors.azure);
    expect(theme.palette?.background?.default).toBe(tokens.semantic.background);
    expect(theme.typography?.fontFamily).toBe(tokens.typography.families.sans);
  });

  it('handles azure accent', () => {
    const theme = buildMuiTheme('azure');
    expect(theme.palette?.primary?.main).toBe(tokens.colors.azure);
  });

  it('handles red accent', () => {
    const theme = buildMuiTheme('red');
    expect(theme.palette?.primary?.main).toBe(tokens.colors.red);
  });

  it('defaults to gold when accent is not recognized', () => {
    const theme = buildMuiTheme('unknown');
    expect(theme.palette?.primary?.main).toBe(tokens.colors.gold);
  });
});

describe('muiTheme', () => {
  it('is a valid MUI theme object', () => {
    expect(muiTheme).toBeDefined();
    expect(muiTheme.palette.primary.main).toBe(tokens.colors.gold);
    expect(muiTheme.typography.fontFamily).toContain('Sora');
  });
});