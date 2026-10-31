# Stdlib surface (`daroja-frontend-starter`)

The starter ships a small set of stdlib-style helpers under
`src/api/`. Each entry below is **canonical** — downstream projects
(`dev-nexus-frontend`, etc.) consume it directly and should not
re-implement the contract.

| Helper | File | Status |
|---|---|---|
| `isLyingEnvelope({ body, status, headers })` | `src/api/envelope.ts` | Stable (since §8.1) |
| `isLyingApiEnvelope({ data, provenance })` | `src/api/envelope.ts` | Stable (since §8.x) |
| `unwrapEnvelope(raw)` | `src/api/envelope.ts` | Stable (since §8.x) |
| `bundleAnalyzer()` (opt-in) | `vite.config.ts` | Stable (since §8.1) |

## `isLyingEnvelope`

A pure function that returns `true` when an HTTP response *claims
success both at the status-code level and at the body level*, yet also
carries a non-empty `error` field. That combination is the "lying
envelope" class of bug that produced the 2026-08-25 frontend-hang
incident; see `src/core/workflows/structure.py` and
`DarojaAI/dev-nexus#1446` for the backend fix.
**Signature**

```ts
import { isLyingEnvelope } from '@/api/envelope';

isLyingEnvelope({
  body: response.data,           // parsed body, or null/undefined
  status: response.status,       // numeric HTTP status
  headers: response.headers,     // optional; reserved for downstream wrappers
});
// -> boolean
```

Detection rules (all of these must hold):

1. `status` is in `[200, 300)`.
2. `body` is a non-null object (not an array, not a string).
3. `body.success === true` (strict equality, not truthy).
4. `body.error` is non-empty (not `undefined`, not `null`, not a
   whitespace-only string).

Anything else returns `false`. The helper is pure, allocation-light,
and has no I/O. Downstream wrappers (e.g. `useApiWithDiagnostics` in
`dev-nexus-frontend`) call into this helper rather than duplicating
the predicate.

## `isLyingApiEnvelope` and `unwrapEnvelope`

A **separate contract** from `isLyingEnvelope` above, with a separate
name on purpose. `isLyingEnvelope` detects the success/error
contradiction in a `{body, status, headers}` envelope.
`isLyingApiEnvelope` detects an *incomplete provenance* in the org-standard
API envelope (RFC `.github#52` / 0004):

```ts
import { unwrapEnvelope } from '@/api/envelope';

const { data, lying } = unwrapEnvelope<RagResearchReport>(raw);
if (lying) {
  throw new Error('Lying-server envelope: missing required provenance.');
}
```

`isLyingApiEnvelope` requires `provenance.source` and
`provenance.captured_at`. **`provenance.signature` is optional** — its
absence does not make an envelope lying. The org reference
implementation (`py-daroja-libs` → `common/service/envelope.py`)
treats it as an "opaque; optional integrity tag" and omits it when no
signing key is configured, and no backend in the family signs
responses.

`unwrapEnvelope` returns the payload from either shape:

- `{ data, provenance }` → `{ data: <payload>, lying: boolean }`
- anything else (a plain model, `null`, a primitive) → `{ data: <raw> }`
  with `lying` undefined.

That second case is why backends that have not adopted the envelope
keep working, and why a hard-coded `raw.data` is wrong — it breaks
every caller against a deployment with the envelope disabled.

**Provenance from the console fork.** These two helpers were forked
into `daroja-intelligence-console` rather than coordinated (starter
issue #10); the fork was the better version, so §8.x promotes it
back to the stdlib. The console's `isLyingEnvelope` was the provenance
predicate under that name — downstream code that imported the name
from the console should now import `isLyingApiEnvelope` from here.

## `bundleAnalyzer()`

Opt-in bundle analyzer. **Not enabled by default.** Enable by either:

- Running `vite build --mode analyze`, or
- Setting `ANALYZE=true` in the env.

When enabled, writes `dist/stats.html` (treemap, gzip + brotli
sizes) for inspection. The starter's alias paths (`@`, `@api`) and
sourcemap setting (`true`) are exported as `STARTER_ALIASES` and
`STARTER_SOURCEMAP` so downstream configurations stay aligned
without copy-paste drift.

## What `docs/STDLIB.md` is *not*

- It is **not** documentation for dev-nexus-frontend's defensive
  layer (`useApiWithDiagnostics`); that file lives in the downstream
  repo and calls into `isLyingEnvelope` as a downstream wrapper.
- It is **not** an API gateway / RPC layer. The starter uses plain
  axios + per-call `client.ts` factories; tRPC, MCP, and copilotkit
  are evaluated elsewhere (plan §3 Tier 3) and are not part of the
  canonical stdlib surface.
