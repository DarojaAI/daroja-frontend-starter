# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

<!-- Add notable changes below this line -->

## [0.3.0] - 2026-10-31

### Added

- **§8.1 stdlib — provenance surface.** `src/api/envelope.ts` now exports `ApiEnvelope<T>`, `isLyingApiEnvelope<T>(env)` and `unwrapEnvelope<T>(raw)` alongside the original `isLyingEnvelope(envelope)`. Promoted from the `daroja-intelligence-console` fork (issue #10): the fork's `unwrapEnvelope` returns the payload *and* a `lying` flag, and handles both the enveloped and the raw response shape — an improvement the stdlib never received because the fork was never coordinated. `signature` is optional: the org reference implementation (`py-daroja-libs` → `common/service/envelope.py`) treats it as an "opaque; optional integrity tag" and omits it when no signing key is configured, and no backend in the family signs responses.
  - The starter's own `isLyingEnvelope({ body, status, headers })` is **unchanged** — a different contract (the success/error contradiction behind the 2026-08-25 frontend-hang incident) that `dev-nexus-frontend` depends on. The two are the same name in two forks; they now have separate names.
  - 12 new pin tests (the existing 10 §8.1 pins are untouched). §8.1 requires new stdlib surface to carry pinned edge cases because downstream projects pin their imports.
- **`docs/DOWNSTREAM_CONFORMANCE.md`** — the §8 downstream-conformance spec.
- **§8 downstream-conformance ratchet** (`scripts/ci/check-downstream-conformance.sh`, `scripts/ci/downstream-conformance-baseline.json`, `scripts/ci/lib/envelope-decls.py`). §8 was a contract with no enforcement: every rule was broken by a downstream and nothing noticed. This makes it a ratchet — drift metrics may only decrease, adoption metrics may only increase, and the baseline is the only reviewable escape hatch. Wired into this repo's CI.
  - The check compares the **normalised declaration** of each shared stdlib symbol rather than file bytes: three legitimately different contracts exist in the family and all three reuse the name `isLyingEnvelope`, so a byte-identical rule would fail two healthy downstreams and a name-only rule would see nothing.
  - The starter and its consumers are separate private repos with no PAT between them, so the check runs *in each consumer against itself* (the script, baseline and parser are mirrored). The starter PR #12; the console and `dev-nexus-frontend` mirror it in their own repos.
- **`pnpm-lock.yaml` is now tracked.** CI has always run `pnpm install --frozen-lockfile`, which requires it — but the lockfile was gitignored, so **every CI run since 2026-09-04 failed at the install step** with `ERR_PNPM_NO_LOCKFILE`. A pnpm-only repo commits its lockfile; that is what makes the frozen install reproducible.

### Changed

- **CI now triggers on `src/**` and `docs/**`**, not just `package.json` / `pnpm-lock.yaml` / `ci.yml`. Stdlib surface changes (which downstream projects pin) were not running CI at all.
- CI's install step uses `pnpm install --frozen-lockfile` (already the case) and now succeeds, since the lockfile is committed.
- CI's test step is `pnpm run test --run`; `pnpm test --run` is rejected by pnpm 9 ("Unknown option: run" — pnpm does not forward bare flags to the script).
- `src/__tests__/theme.test.ts` narrows MUI v9's union types via small typed accessors (`mainOf` / `fontFamilyOf`) instead of casting the theme. `pnpm type-check` now passes; MUI v9 types a palette slot as `SimplePaletteColorOptions | ColorPartial` and `ColorPartial` has no `main`.

### Removed

- `package-lock.json` — tracked, and forbidden by this repo's own `.gitignore` ("npm artifacts (rejected — pnpm-only)").
- The `pre-commit@^3.5.0` npm devDependency — that version does not exist on npm (latest is 2.0.0), so `pnpm install` failed outright. The pre-commit hooks here are installed with the **python** `pre-commit` package (`.pre-commit-config.yaml`), so the npm dependency was vestigial.

### Fixed

- The starter's CI had been failing on every run since 2026-09-04. Six independent causes, all fixed above: the gitignored lockfile, the tracked `package-lock.json`, the unresolvable npm `pre-commit` pin, CI not triggering on `src/**`, the `pnpm test --run` invocation, and 6 MUI-v9 type errors in a test.

## [0.2.0] - 2026-09-03

### Changed

- Switched to pnpm-only package management (`packageManager` field pinned to `pnpm@9.12.0`, `engines.node` set to `>=20.19.0`).
- Lockfile policy: `package-lock.json` and `yarn.lock` are rejected; only `pnpm-lock.yaml` is tracked. `.gitignore` updated to enforce.
- CI and deploy workflows now use `pnpm/action-setup@v4` and `pnpm install --frozen-lockfile`.
- `deploy.yml` switched the production-deps audit gate from `npm-audit` to `pnpm-audit`.
- Dropped `--ext` from the lint script (eslint v10 canonical, matches `dev-nexus-frontend` PR #125).
- Node 20 → Node 24 in `ci.yml` runner.

### Added

- New `.pre-commit-config.yaml` mirroring CI gates: Prettier, gitleaks v8.18.0, yaml/json sanity hooks, local ESLint hook wired to `pnpm lint --max-warnings 0`.
- New `.github/workflows/gitleaks.yml` dedicated secret-scan workflow (no license wrapper; direct CLI install of gitleaks v8.18.0, SHA-pinned).
- New `docs/USING_STARTER.md` — reusable-knowledge guide for downstream projects (inherits / customize / canonical contracts table; CI/pre-commit mirror table; push-back-upstream discipline; anti-pattern list).
- Description field in `package.json` refreshed to mention pnpm + infra-actions.

### Removed

- `gitleaks/gitleaks-action@v2` wrapper — replaced with direct CLI install (gitleaks v2 requires a license; the org doesn't have one).
- The duplicate gitleaks step that lived inside `ci.yml` — secrets scanning now lives only in the dedicated `gitleaks.yml` workflow.

## [0.1.0] - 2026-08-13

### Added

- Initial scaffold: Vite 8 + React 19 + TypeScript 6, Vitest 4, MUI v9 + Emotion, Cloudflare Workers + Static Assets deploy, infra-actions CI/CD, SPA routing with Cloudflare SPA fallback.
- §8.1 stdlib canonicalization: `src/api/envelope.ts` exports `isLyingEnvelope()` predicate for downstream apps. PR #5.
- Canonical starter alias contract: `STARTER_ALIASES` (`@`, `@api`) and `STARTER_SOURCEMAP` exported from `vite.config.ts`. PR #5.
- Brand-token bridge via `src/theme/mui-theme.ts`. PR #4 (chore/align-platform-posture).

## [0.0.0] - 2026-08-12

### Notes

- Repo bootstrapped under DarojaAI/.github RFC #2 Phase 2 — Shared Libraries & Templates category. PR #2.
- CODEOWNERS file added. PR #3.
