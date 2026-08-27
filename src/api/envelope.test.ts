import { describe, expect, it } from 'vitest';
import { isLyingEnvelope, type Envelope } from './envelope';

const envelope = (overrides: Partial<Envelope> = {}): Envelope => ({
  body: undefined,
  status: 200,
  headers: {},
  ...overrides,
});

describe('isLyingEnvelope', () => {
  it('detects success=true + non-empty error on a 2xx', () => {
    expect(
      isLyingEnvelope(
        envelope({
          body: { success: true, error: 'workflow crashed', data: null },
        })
      )
    ).toBe(true);
  });

  it('returns false for a clean 2xx success', () => {
    expect(
      isLyingEnvelope(
        envelope({
          body: { success: true, data: { workflows: [] } },
        })
      )
    ).toBe(false);
  });

  it('returns false for a 2xx with success=false', () => {
    expect(
      isLyingEnvelope(
        envelope({
          status: 200,
          body: { success: false, error: 'real failure' },
        })
      )
    ).toBe(false);
  });

  it('returns false for a non-2xx status, even if body shape lies', () => {
    expect(
      isLyingEnvelope(
        envelope({
          status: 500,
          body: { success: true, error: 'should not flag this' },
        })
      )
    ).toBe(false);
  });

  it('returns false for null/undefined body', () => {
    expect(isLyingEnvelope(envelope({ body: null }))).toBe(false);
    expect(isLyingEnvelope(envelope({ body: undefined }))).toBe(false);
  });

  it('returns false for non-object body', () => {
    expect(isLyingEnvelope(envelope({ body: 'a string' }))).toBe(false);
    expect(isLyingEnvelope(envelope({ body: 42 }))).toBe(false);
  });

  it('returns false when success or error field is absent', () => {
    expect(isLyingEnvelope(envelope({ body: { success: true } }))).toBe(false);
    expect(isLyingEnvelope(envelope({ body: { error: 'x' } }))).toBe(false);
  });

  it('returns false for empty/whitespace error string', () => {
    expect(
      isLyingEnvelope(envelope({ body: { success: true, error: '' } }))
    ).toBe(false);
    expect(
      isLyingEnvelope(envelope({ body: { success: true, error: '   ' } }))
    ).toBe(false);
    expect(
      isLyingEnvelope(envelope({ body: { success: true, error: null } }))
    ).toBe(false);
  });

  it('returns false for array bodies (objects but no success field)', () => {
    expect(isLyingEnvelope(envelope({ body: [] }))).toBe(false);
    expect(isLyingEnvelope(envelope({ body: [{ success: true }] }))).toBe(false);
  });

  it('treats non-boolean success as not-the-success-we-expect', () => {
    expect(
      isLyingEnvelope(envelope({ body: { success: 'true', error: 'x' } }))
    ).toBe(false);
    expect(
      isLyingEnvelope(envelope({ body: { success: 1, error: 'x' } }))
    ).toBe(false);
  });
});
