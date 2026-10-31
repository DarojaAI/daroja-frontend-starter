# Downstream conformance (§8 ratchet)

§8 of [`USING_STARTER.md`](USING_STARTER.md) is a contract. As of
2026-10-29 it was a contract with **no enforcement**: every rule was
broken by a downstream and nothing noticed. The architect lane's family
assessment (A6) listed five violations in the console alone — redefined
`STARTER_ALIASES`, no gitleaks, `@cloudflare/workers-types` installed, the
stdlib forked into a different shape, `DEPLOYMENT_LESSONS.md` not carried
forward — and *nothing* distinguished it from `dev-nexus-frontend`, which
happened to re-sync.

This is the mechanism. It is a **ratchet**, in the same shape as the
`linux-desktop-seed` surface ratchet (`scripts/ci/surface-budget-baseline.json`):
the current state is recorded as a baseline, and the only permitted
direction is improvement. A warning is a comment; a failure is a ratchet.

## The check

`scripts/ci/check-downstream-conformance.sh` measures a repo against the
§8 contract and compares it to its baseline entry.

```bash
# in the starter
scripts/ci/check-downstream-conformance.sh --self

# in a consumer (after mirroring the script + baseline)
scripts/ci/check-downstream-conformance.sh --repo . --name DarojaAI/<repo>
```

Exit codes: `0` conformant, `1` regression, `2` usage error.

## Two directions

§8 cuts both ways, so the ratchet has two directions:

- **drift** metrics (violations present) may only **decrease**. A downstream
  that gains a violation fails.
- **adoption** metrics (canonical surface adopted) may only **increase**. A
  downstream that stops mirroring the canonical stdlib fails.

| metric | dir | what it measures |
|---|---|---|
| `deps_below_floor` | down | deps below the starter's floor (vite / typescript / @mui/material / vitest) |
| `missing_required_files` | down | §8-required surfaces absent (`.pre-commit-config.yaml`, gitleaks workflow, `DEPLOYMENT_LESSONS.md`) |
| `forbidden_files` | down | npm artifacts tracked (`package-lock.json`, `yarn.lock`) |
| `npm_package_manager` | down | `packageManager` set to `npm@` instead of pnpm |
| `cloudflare_workers_types` | down | `@cloudflare/workers-types` installed (conflicts with Node types) |
| `starter_aliases_redefined` | down | `STARTER_ALIASES` re-declared locally instead of extended |
| `stdlib_unknown_exports` | down | stdlib symbols the starter does not have — a third shape invented |
| `stdlib_signature_divergent` | down | same symbol name, **different declaration** — a forked contract |
| `stdlib_adoption` | up | canonical provenance-stdlib exports present (`ApiEnvelope`, `isLyingApiEnvelope`, `unwrapEnvelope`) |

### Why `stdlib_signature_divergent` and not "byte-identical"

The issue's first sketch proposed "`src/api/envelope.ts` must be
byte-identical to the starter's". That is **wrong**, and implementing it
would have failed two healthy downstreams. There are three genuinely
different contracts in the family, and all three reuse the name
`isLyingEnvelope`:

| repo | declaration | contract |
|---|---|---|
| starter | `isLyingEnvelope(envelope: Envelope)` | HTTP success/error contradiction (the 2026-08-25 frontend-hang class) |
| console | `isLyingEnvelope<T>(env: ApiEnvelope<T>)` | provenance completeness |
| dev-nexus-frontend | `isLyingEnvelope<S extends StandardSkillResponse>(response)` | `StandardSkillResponse` shape |

A byte-identical rule cannot be right when three different contracts
legitimately exist. Worse, a **name-only** comparison sees
"`isLyingEnvelope` present" in all three and reports nothing — the fork
stays invisible.

So the check compares the **normalised declaration** of each shared
symbol, not the file bytes. `scripts/ci/lib/envelope-decls.py` extracts
`symbol<TAB>declaration` per export, joining multi-line declarations
(a grep cannot). Two copies whose declarations differ are divergent —
that is the fork, caught mechanically.

## Where it runs, and why

The check runs **in each downstream**, not only in the starter. The
starter and its consumers are separate private repos, and the starter has
no PAT with which to read them. So:

- the starter **ships** the canonical script, the parser and the baseline
  (which carries the registry of every consumer);
- each consumer **mirrors** those three files — the same way it already
  mirrors `src/api/envelope.ts`, `vite.config.ts` and
  `.pre-commit-config.yaml` — and runs the check against **itself**;
- the check exits non-zero on a regression, so the consumer's CI is red.

This is the same mirroring mechanism that produced the fork in the first
place, pointed in the right direction: a downstream that stops mirroring
now fails its own CI.

## The baseline is the only escape hatch

Raising a drift count, or lowering an adoption count, requires editing
`scripts/ci/downstream-conformance-baseline.json` **and** appending to its
`_note` ledger. That is the reviewable hatch — the same shape as the LDS
surface ratchet, where a baseline raise is a line in a ledger that a
reviewer has to read.

```bash
scripts/ci/check-downstream-conformance.sh --self \
  --update-baseline --note "why this change is intended"
```

The note is mandatory; the update is refused without it.

## Current baseline (2026-10-31)

| metric | starter | console | dev-nexus-frontend |
|---|---|---|---|
| `deps_below_floor` | 0 | 4 | 0 |
| `missing_required_files` | 0 | 3 | 2 |
| `forbidden_files` | 0 | 0 | 0 |
| `npm_package_manager` | 0 | 0 | 0 |
| `cloudflare_workers_types` | 0 | 1 | 0 |
| `starter_aliases_redefined` | 0 | 1 | 0 |
| `stdlib_unknown_exports` | 0 | 0 | 0 |
| `stdlib_signature_divergent` | 0 | 1 | 1 |
| `stdlib_adoption` | 3 | 2 | 0 |

The console and dev-nexus-frontend start with violations **on purpose**:
a ratchet that starts at zero is a gate, and a gate that fires on the
first run is a gate nobody runs. The baseline records reality; every
metric can only improve from here.

## Keeping the mirrors in sync

Each consumer holds a copy of the baseline, and each copy carries the
registry of **every** consumer. A consumer's own entry is what its own
check compares against; the other entries are informational.

That means a copy can drift from the starter's. Two rules make that
safe:

1. **A stale registry entry only ever makes the check more lenient, never
   falsely failing.** If a consumer fixes a violation and updates its own
   entry (4 -> 2) while the starter's copy still says 4, the consumer's
   check compares 2 against 4 and passes with a negative delta. Nothing
   breaks; the improvement is simply forgotten by the shared copy.
2. **Improvements should be mirrored BACK to the starter**, so the
   org-wide registry reflects reality. When a consumer lowers a drift
   count or raises an adoption count, open a companion PR against
   `daroja-frontend-starter` carrying the same one-line baseline edit
   (with its own `--note`), or include that edit in the same change
   when the repos are being touched together.

Rule 1 is what makes the whole thing safe to ship with violations
already present: a consumer that never touches its baseline copy still
gets a working, meaningful gate.

## What this does not do

- It does not check *content* of the mirrored files beyond the stdlib
  export shapes. A downstream can still hold a stale `envelope.ts` body
  under the right names; that is what a contract test would catch
  (console #54).
- It does not enforce the starter's own CI. The starter's CI was broken
  from 2026-09-04 until PR #11 fixed it — a contract that is not checked
  anywhere is worth nothing.

## Refs

- starter #9 (this issue), #10 (the fork that motivated it), #6 (§8.1 precedent)
- console #54 (cross-repo contract tests — the complement to this ratchet)
- assessment A6; `docs/USING_STARTER.md` §8
- `linux-desktop-seed` PR #2995 (the surface ratchet this mirrors)
