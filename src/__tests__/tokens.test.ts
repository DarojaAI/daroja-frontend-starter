import { describe, it, expect } from 'vitest';
import { tokens } from '../theme/tokens';

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

describe('tokens.colors', () => {
  it.each(Object.entries(tokens.colors))('%s is a valid 6-digit hex color', (_name, value) => {
    expect(value).toMatch(HEX6);
  });
});

describe('tokens.semantic', () => {
  it.each(['accent', 'background', 'surface', 'foreground'] as const)(
    'has a %s key',
    (key) => {
      expect(tokens.semantic).toHaveProperty(key);
      expect(typeof tokens.semantic[key]).toBe('string');
    },
  );
});
