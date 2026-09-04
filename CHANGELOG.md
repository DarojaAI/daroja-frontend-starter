# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

<!-- Add notable changes below this line -->

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
