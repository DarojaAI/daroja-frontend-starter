# DarojaAI Frontend Starter

> **Category:** 5. Shared Libraries & Templates — *Vite + React + TypeScript project template*

Template for new DarojaAI frontend projects.

## Features

- Vite 8 + React 19 + TypeScript 6
- Vitest 4 for testing
- MUI v9 + Emotion theming with brand-token bridge
- Cloudflare Workers + Static Assets deployment
- DarojaAI/infra-actions CI/CD
- SPA routing with Cloudflare SPA fallback

## Generated Projects

No projects have been generated from this template yet. To generate a new frontend, see the [Quick Start](#quick-start) section.

## Quick Start

```bash
# 1. Copy this template
cp -r daroja-frontend-starter my-new-project
cd my-new-project

# 2. Replace placeholders
# - README.md: replace with project-specific docs
# - package.json: update `name`

# 3. Initialize
git init
git add .
git commit -m "init: from daroja-frontend-starter"

# 4. Add project-specific code
# - src/api/        # API client modules
# - src/components/ # React components
# - src/hooks/      # TanStack Query hooks
# - src/store/      # Zustand stores (UI state only)
# - src/pages/      # Route-level pages
```

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run type-check # TypeScript check
npm run lint       # ESLint
npm run test       # Vitest
```

## Deployment

**Start here:** [DEPLOY.md](./DEPLOY.md) — step-by-step guide

**Troubleshooting:** [DEPLOYMENT_LESSONS.md](./DEPLOYMENT_LESSONS.md) — what went wrong and why

## Architecture

| Concern | Tool |
|---|---|
| Server state | TanStack Query |
| Client state | Zustand |
| API transport | Axios + factory |
| Styling | MUI v9 + Emotion (brand tokens) |
| Testing | Vitest |

## Rules

1. **Zustand stores hold UI state only** (filters, toggles). Never fetch data in stores.
2. **TanStack Query handles all server state**. Use `useQuery` / `useMutation` for data.
3. **API client is a factory** (`createApiClient()`) with interceptors for auth + errors.
4. **Environment variables** use `VITE_` prefix for build-time injection.
5. **Worker types**: Use inline types or `Record<string, unknown>`. Do not install `@cloudflare/workers-types` — it conflicts with Node types.

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