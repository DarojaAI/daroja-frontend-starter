# Deployment Guide

Deploy a React + Vite frontend to Cloudflare Workers with static assets.

## What You Get

| Environment | Worker Name | URL |
|---|---|---|
| `dev` | `repo-name-dev` | `repo-name-dev.ACCOUNT.workers.dev` |
| `prod` | `repo-name-prod` | `repo-name-prod.ACCOUNT.workers.dev` |
| `anything` | `repo-name-anything` | `repo-name-anything.ACCOUNT.workers.dev` |

Each environment is a separate Worker. They do not overwrite each other.

## Prerequisites (One-Time Setup)

### 1. Cloudflare

- Ensure you have a Cloudflare account
- The Worker name will be created automatically on first deploy

### 2. GitHub Environments

In your repo, create one Environment per deployment target:

1. Go to **Settings → Environments → New environment**
2. Name it (e.g., `dev`, `prod`, `staging`)
3. For **each** environment, add:

| Type | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token |
| Variable | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| Variable | `API_BASE_URL` | Backend API URL for this environment |

> **Critical:** The token goes in **Environment secrets**, not repository secrets. The `environment:` declaration in the workflow is what makes this work.

### 3. Files in This Repo

Ensure these files exist:

| File | Purpose |
|---|---|
| `src/worker.ts` | Worker entry point — serves static assets |
| `wrangler.toml` | Base wrangler config (name gets overridden at deploy) |
| `.github/workflows/deploy.yml` | Deploy workflow |
| `eslint.config.cjs` | Must include `Request` and `Response` in globals |

## How to Deploy

1. Go to **Actions → Deploy Frontend → Run workflow**
2. Enter the environment name (must match a GitHub Environment)
3. Click **Run workflow**

The workflow will:
1. Run type check, lint, tests, npm audit
2. Build the frontend with the environment's `API_BASE_URL`
3. Generate `wrangler.{env}.toml` with the correct Worker name
4. Deploy to Cloudflare

## How to Verify

1. Check the Actions run output for the deployed URL
2. Open the URL in a browser
3. For SPAs, all routes should return `index.html` (Cloudflare handles this via `not_found_handling = "single-page-application"`)

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `Authentication error [code: 10000]` | `CLOUDFLARE_API_TOKEN` not in environment secrets | Add token to the GitHub Environment |
| `Invalid token [code: 9106]` | Wrong token value | Regenerate token in Cloudflare, paste into GitHub |
| `not a Pages project [code: 8000007]` | Using Pages instead of Workers | This setup uses Workers + `[assets]`, not Pages |
| ESLint `'Request' is not defined` | Missing ESLint globals | Add `Request: 'readonly'` to globals |
| TypeScript errors after installing workers types | `@cloudflare/workers-types` conflicts with Node types | Do not install it; use inline types in `worker.ts` |
