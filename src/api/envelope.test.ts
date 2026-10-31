import { describe, expect, it } from 'vitest';
import {
  isLyingEnvelope,
  isLyingApiEnvelope,
  unwrapEnvelope,
  type ApiEnvelope,
  type Envelope,
} from './envelope';

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

// ---------------------------------------------------------------------------
// §8.x — provenance-completeness predicate + unwrapEnvelope
// ---------------------------------------------------------------------------
//
// Promoted from the daroja-intelligence-console fork (issue #10). The
// fork's `unwrapEnvelope` was an improvement that never reached the
// stdlib; this is that change coming home.
//
// These are pin tests: §8.1 requires new stdlib surface to carry pinned
// edge cases, because downstream projects pin their imports.

describe('isLyingApiEnvelope', () => {
  const apiEnvelope = (
    overrides: Partial<ApiEnvelope<{ id: string }>> = {}
  ): ApiEnvelope<{ id: string }> => ({
    data: { id: 'x' },
    provenance: { source: 'wiki', captured_at: '2026-01-01T00:00:00Z' },
    ...overrides,
  });

  it('returns false for a fully-provisioned envelope', () => {
    expect(isLyingApiEnvelope(apiEnvelope())).toBe(false);
  });

  it('returns false when provenance is missing entirely', () => {
    const env = { data: { id: 'x' } } as ApiEnvelope<{ id: string }>;
    expect(isLyingApiEnvelope(env)).toBe(true);
  });

  it('returns true when provenance.source is missing', () => {
    const env = apiEnvelope({
      provenance: { captured_at: '2026-01-01T00:00:00Z' },
    });
    expect(isLyingApiEnvelope(env)).toBe(true);
  });

  it('returns true when provenance.captured_at is missing', () => {
    const env = apiEnvelope({ provenance: { source: 'wiki' } });
    expect(isLyingApiEnvelope(env)).toBe(true);
  });

  it('returns false when provenance.signature is missing (signature is optional)', () => {
    // The org reference implementation (py-daroja-libs
    // common/service/envelope.py) treats signature as an optional
    // integrity tag and omits it when no signing key is configured.
    // No backend in this family signs responses.
    const env = apiEnvelope({
      provenance: { source: 'wiki', captured_at: '2026-01-01T00:00:00Z' },
    });
    expect(isLyingApiEnvelope(env)).toBe(false);
  });

  it('returns false when signature is present', () => {
    const env = apiEnvelope({
      provenance: {
        source: 'wiki',
        captured_at: '2026-01-01T00:00:00Z',
        signature: 'sig',
      },
    });
    expect(isLyingApiEnvelope(env)).toBe(false);
  });
});

describe('unwrapEnvelope', () => {
  it('passes through a raw model (no envelope wrapping)', () => {
    const raw = { id: 'tenant-1', name: 'Acme' };
    const result = unwrapEnvelope(raw);
    expect(result.data).toEqual(raw);
    expect(result.lying).toBeUndefined();
  });

  it('unwraps a valid envelope', () => {
    const raw: ApiEnvelope<{ id: string }> = {
      data: { id: 'tenant-1' },
      provenance: { source: 'broker', captured_at: '2026-01-01T00:00:00Z' },
    };
    const result = unwrapEnvelope(raw);
    expect(result.data).toEqual({ id: 'tenant-1' });
    expect(result.lying).toBe(false);
  });

  it('detects a lying envelope (missing provenance fields)', () => {
    const raw = { data: { id: 'tenant-1' }, provenance: { source: 'broker' } };
    const result = unwrapEnvelope(raw);
    expect(result.data).toEqual({ id: 'tenant-1' });
    expect(result.lying).toBe(true);
  });

  it('detects a lying envelope (no provenance at all)', () => {
    const raw = {
      data: { id: 'tenant-1' },
      provenance: {},
    } as unknown as ApiEnvelope<{ id: string }>;
    const result = unwrapEnvelope(raw);
    expect(result.data).toEqual({ id: 'tenant-1' });
    expect(result.lying).toBe(true);
  });

  it('unwraps an envelope with no signature (the real backend shape)', () => {
    // Both backends in this family send source + captured_at only.
    const raw = {
      data: { id: 'tenant-1' },
      provenance: { source: 'wiki', captured_at: '2026-10-31T19:18:15Z' },
    };
    const result = unwrapEnvelope(raw);
    expect(result.data).toEqual({ id: 'tenant-1' });
    expect(result.lying).toBe(false);
  });

  it('handles null and primitives as raw models', () => {
    expect(unwrapEnvelope(null).data).toBeNull();
    expect(unwrapEnvelope('hello').data).toBe('hello');
    expect(unwrapEnvelope(42).data).toBe(42);
  });
});
