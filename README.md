# DarojaAI Frontend Starter

Template for new DarojaAI frontend projects.

## Features

- Vite 7 + React 19 + TypeScript
- Vitest for testing
- Cloudflare Pages + Workers deployment
- DarojaAI/infra-actions CI/CD
- SPA routing with Cloudflare SPA fallback

## Usage

```bash
# 1. Copy this template
cp -r daroja-frontend-starter my-new-project
cd my-new-project

# 2. Replace placeholders
# - wrangler.toml: update `name`
# - README.md: replace with project-specific docs

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

### CI (automatic)

On push/PR to `main`, CI runs type check, lint, tests, npm audit.

### Deploy (manual)

```bash
# In GitHub Actions, trigger workflow_dispatch
# Select environment: dev or prod
```

Requires:
- `CLOUDFLARE_API_TOKEN` (repository secret)
- `CLOUDFLARE_ACCOUNT_ID` (repository variable)
- `API_BASE_URL` (environment variable)

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
