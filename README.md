# DarojaAI Frontend Starter

> **Category:** 5. Shared Libraries & Templates — *Vite + React + TypeScript project template*
> **Deploy target:** Cloudflare Pages (recommended) or Cloudflare Workers + Static Assets (current default)
> **Package manager:** pnpm-only (see [USING_STARTER.md](./docs/USING_STARTER.md))

Template for new DarojaAI frontend projects. Generated downstream projects inherit the platform posture: pnpm-only, Cloudflare Pages deploys, ESLint v10 flat-config, gitleaks secret-scan in CI.

## Features

- **Vite 8** + **React 19** + **TypeScript 6**
- **Vitest 4** for testing (jsdom)
- **MUI v9** + Emotion theming with brand-token bridge
- **Cloudflare Workers + Static Assets** deployment (via `src/worker.ts`)
- **DarojaAI/infra-actions** CI/CD (tool/check/{typescript,eslint,vitest,pnpm-audit})
- **SPA routing** with Cloudflare SPA fallback
- **§8.1 stdlib** — `src/api/envelope.ts` exports `isLyingEnvelope()` predicate for downstream apps to detect lying-server envelopes
- **Canonical starter alias contract** — `STARTER_ALIASES` (`@`, `@api`) and `STARTER_SOURCEMAP` exported from `vite.config.ts`; downstream apps can extend but not redefine

## Generated Projects

No projects have been generated from this template yet. To generate a new frontend, see the [Quick Start](#quick-start) section.

## Quick Start

```bash
# 1. Copy this template (cp -r works for low-fidelity forks)
cp -r daroja-frontend-starter my-new-project
cd my-new-project

# 2. Replace placeholders
# - README.md: replace with project-specific docs
# - package.json: update `name`
# - package.json: update `description`

# 3. Initialize
git init
git add .
git commit -m "init: from daroja-frontend-starter"

# 4. Bootstrap tooling
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
pnpm exec pre-commit install

# 5. Add project-specific code
# - src/api/        # API client modules (canonical: re-export @api/envelope.ts)
# - src/components/ # React components
# - src/hooks/      # TanStack Query hooks (server state)
# - src/store/      # Zustand stores (UI state only)
# - src/lib/        # Shared helpers (envelope detector etc.)
# - src/pages/      # Route-level pages (SPA)
# - src/theme/      # MUI theme (brand-token bridge)
# - src/worker.ts   # Cloudflare Worker entry — leave as-is unless changing deploy shape
```

## Scripts

```bash
pnpm dev         # Start Vite dev server with HMR
pnpm build       # Production build (tsc + vite build)
pnpm preview     # Serve production build locally
pnpm type-check  # tsc --noEmit (no JS emitted)
pnpm lint        # ESLint flat-config (warnings-as-errors)
pnpm test        # Vitest (watch mode)
pnpm test --run  # Vitest (single run, used in CI)
```

## Deployment

**Start here:** [DEPLOY.md](./DEPLOY.md) — step-by-step guide
**Troubleshooting:** [DEPLOYMENT_LESSONS.md](./DEPLOYMENT_LESSONS.md) — what went wrong and why

## Architecture

| Concern | Tool |
|---|---|
| Server state | TanStack Query |
| Client state | Zustand (UI state only) |
| API transport | Axios + factory |
| Styling | MUI v9 + Emotion (brand-token bridge) |
| Testing | Vitest + React Testing Library |
| Bundling | Vite (sourcemap on by default) |
| Bundle analysis | `rollup-plugin-visualizer` (opt-in: `pnpm build` with `--mode analyze` or `ANALYZE=true`) |
| Deploy | Cloudflare Workers + Static Assets |
| CI gates | DarojaAI/infra-actions (typescript + eslint + vitest + pnpm-audit) |

## Rules

1. **Zustand stores hold UI state only** (filters, toggles, modal state). Never fetch data in stores.
2. **TanStack Query handles all server state**. Use `useQuery` / `useMutation`.
3. **API client is a factory** (`createApiClient()`) with interceptors for auth + errors.
4. **Environment variables** use `VITE_` prefix for build-time injection. No `REACT_APP_*` — Vite does not read them.
5. **Worker types**: Use inline types or `Record<string, unknown>`. Do not install `@cloudflare/workers-types` — it conflicts with Node types.
6. **§8.1 envelope detection**: prefer `import { isLyingEnvelope } from '@api/envelope'` over re-implementing the predicate inline. Trust the stdlib contract.
7. **Starter aliases**: downstream code may extend `STARTER_ALIASES` (e.g. add `@components`) but the canonical `@` and `@api` are locked.
8. **CI is the source of truth**: `pnpm lint --max-warnings 0`, `pnpm test --run`, and `pnpm build` all gate merges. Do not disable checks.

## Brand tokens

Tokens are the **single source of truth** from `DarojaAI/design-artifacts`.

- Canonical machine-readable form: `DarojaAI/design-artifacts/tokens.json`
- Scale/type ramp: `DarojaAI/design-artifacts/brands/daroja.json`
- Theme bridge: `src/theme/mui-theme.ts` — maps tokens to MUI v9 `ThemeOptions`

### Accent system

The starter ships with a four-accent system (`gold`, `azure`, `green`, `red`).

- **Default accent:** gold (`#E6B340`)
- **Swappable at runtime:** set `data-accent` on `<html>` element
- **To change a generated project's accent:** edit `src/theme/mui-theme.ts` — do NOT add new tokens

The `tokens.ts` file extracts the values from `design-artifacts/tokens.json` and `brands/daroja.json`. When the org publishes a shared package, replace the import with that package path.

## See also

- [docs/USING_STARTER.md](./docs/USING_STARTER.md) — full guide for downstream consumers
- [docs/STDLIB.md](./docs/STDLIB.md) — canonical stdlib surface (envelope etc.)
- [DEPLOY.md](./DEPLOY.md) — deploy workflow + Cloudflare Workers setup
- [DEPLOYMENT_LESSONS.md](./DEPLOYMENT_LESSONS.md) — what went wrong + why (read this BEFORE first deploy)
