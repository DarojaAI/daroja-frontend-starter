/**
 * Stdlib envelope-shape helpers.
 *
 * Pure, allocation-free, side-effect-free detection utilities for the
 * "lying-envelope" class of bug: an HTTP response whose status code and
 * outer success field both claim success, but a non-empty inner `error`
 * field contradicts that. Catching this at the HTTP boundary is cheaper
 * than catching it at every call site.
 *
 * Downstream projects consume this helper directly. Per-project wrappers
 * (e.g. dev-nexus-frontend's `useApiWithDiagnostics` defensive layer)
 * should call into this helper rather than re-implement the predicate.
 */

/**
 * The normalized HTTP envelope exposed to the rest of the application.
 *
 * - `body`    — already-parsed response body (object or null). In practice
 *              callers pass `response.data` from axios or the JSON-decoded
 *              body of a `fetch` `Response`.
 * - `status`  — numeric HTTP status code. 2xx is treated as success by the
 *              envelope layer; this helper does not reclassify that.
 * - `headers` — response headers as a plain object, optional but useful
 *              for downstream wrappers that want to inspect e.g. retry-after.
 *
 * All fields are kept generic so any downstream project can shape its own
 * envelope spec by calling `isLyingEnvelope({ body, status, headers })`.
 */
export interface Envelope {
  body: unknown;
  status: number;
  headers?: Record<string, string | string[] | undefined>;
}

const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Returns true when a 2xx response body claims `success: true` *and* also
 * carries a non-empty `error` field. That combination is impossible under
 * a well-formed envelope — it means the backend ranked an inner error
 * without reconciling it into the outer envelope, and is the specific
 * shape that produced the 2026-08-25 frontend-hang incident.
 *
 * Returns false when:
 *  - the status code is not 2xx (a non-2xx is a hard error, not a lie)
 *  - the body is null/undefined
 *  - the body is not an object (JSON was missing or unparseable)
 *  - the body has `success !== true`
 *  - the body has no `error`, or the `error` is empty/falsy
 *
 * Pure function. No I/O, no logging, no telemetry — downstream projects
 * are responsible for their own observability around detected lies.
 */
export function isLyingEnvelope(envelope: Envelope): boolean {
  const { body, status } = envelope;

  if (status < 200 || status >= 300) return false;
  if (body === null || body === undefined) return false;
  if (typeof body !== 'object') return false;

  // Reject arrays up-front — they're objects but never have `.success`.
  if (Array.isArray(body)) return false;

  if (!hasOwn(body, 'success') || !hasOwn(body, 'error')) return false;

  const success = (body as Record<string, unknown>).success;
  const error = (body as Record<string, unknown>).error;

  // The success flag has to be the literal boolean true. Strings like
  // "true" or numbers like 1 are treated as "not the success we expect"
  // — we only flag the strict envelope-shape mismatch we know about.
  if (success !== true) return false;

  // An empty/null/undefined/whitespace-only error field is not a lie,
  // it's just a degenerate envelope. Only non-empty `error` values count.
  if (error === undefined || error === null) return false;
  if (typeof error === 'string' && error.trim() === '') return false;

  return true;
}
