# DarojaAI Frontend Starter

Template for new DarojaAI frontend projects.

## Features

- Vite 7 + React 19 + TypeScript
- Vitest for testing
- Cloudflare Workers + Static Assets deployment
- DarojaAI/infra-actions CI/CD
- SPA routing with Cloudflare SPA fallback

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
| Styling | (project-specific) |
| Testing | Vitest |

## Rules

1. **Zustand stores hold UI state only** (filters, toggles). Never fetch data in stores.
2. **TanStack Query handles all server state**. Use `useQuery` / `useMutation` for data.
3. **API client is a factory** (`createApiClient()`) with interceptors for auth + errors.
4. **Environment variables** use `VITE_` prefix for build-time injection.
5. **Worker types**: Use inline types or `Record<string, unknown>`. Do not install `@cloudflare/workers-types` — it conflicts with Node types.
