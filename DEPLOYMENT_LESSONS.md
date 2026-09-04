# Deployment Lessons Learned

> Originated during the 2026-08 deployment hardening pass and updated through
> the 2026-08-30 incident. The current canonical lockfile / package-manager
> posture is **pnpm-only** — see [`docs/USING_STARTER.md`](./docs/USING_STARTER.md)
> §2 "What you inherit" for the full contract.

## Workers + Static Assets (not Pages)

**What we learned:**
- Cloudflare Workers now serves static assets natively via `[assets]` in `wrangler.toml`
- Use `wrangler deploy` (not `wrangler pages deploy`)
- Requires a Worker entry point (`src/worker.ts`) — even if it just proxies to assets

**Why this matters:**
- Eliminates separate Pages project complexity
- Single Worker per environment, named `PROJECT-NAME-{env}`
- Avoids error 8000007 ("not a Pages project")

**Required files:**
```toml
# wrangler.toml
name = "project-name"
main = "src/worker.ts"
compatibility_date = "2026-05-21"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

```ts
// src/worker.ts
export default {
  async fetch(request: Request, env: Record<string, unknown>): Promise<Response> {
    const assets = env.ASSETS as { fetch: (req: Request) => Promise<Response> };
    return assets.fetch(request);
  },
};
```

## ESLint Globals for Worker Files

**What we learned:**
- ESLint `no-undef` rule fails on `Request` in `src/worker.ts`
- The `eslint-env serviceworker` comment does NOT work in flat config
- Must add `Request` and `Response` to `globals` in `eslint.config.js`

```js
// eslint.config.js
globals: {
  // ... existing globals
  Request: 'readonly',
  Response: 'readonly',
  RequestInit: 'readonly',
}
```

**Avoid `@cloudflare/workers-types`**
- Installing it broke existing TypeScript types (`NodeJS`, `require`, `global` missing)
- Use inline types or `Record<string, unknown>` casting instead
- The `/// <reference types="..." />` directive also causes conflicts

## Environment-Specific Worker Naming

**What we learned:**
- Single Worker gets overwritten by every deploy regardless of environment
- Must deploy to **separate Workers per environment**:
  - `project-name-dev` → `project-name-dev.ACCOUNT.workers.dev`
  - `project-name-prod` → `project-name-prod.ACCOUNT.workers.dev`

**Implementation:**
Generate `wrangler.{env}.toml` at deploy time:
```yaml
- name: Generate wrangler config
  env:
    ENV_NAME: ${{ github.event.inputs.environment }}
  run: |
    cat > "wrangler.${ENV_NAME}.toml" << EOF
    name = "project-name-${ENV_NAME}"
    main = "src/worker.ts"
    compatibility_date = "2026-05-21"
    [assets]
    directory = "./dist"
    not_found_handling = "single-page-application"
    EOF
```

## GitHub Environment Secrets (not Repository Secrets)

**What we learned:**
- `CLOUDFLARE_API_TOKEN` must be in **GitHub Environment secrets**, not repository secrets
- The job MUST declare `environment:` for the token to resolve
- Error 10000 ("Authentication error") = token not resolving
- Error 9106 ("Invalid token") = wrong token value

```yaml
deploy:
  environment: ${{ github.event.inputs.environment }}  # REQUIRED
  steps:
    - uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}  # Resolves per-environment
```

## Manual Deploy Only

**What we learned:**
- Never auto-deploy on push/merge
- Use `workflow_dispatch` with explicit environment input
- No branch-based fallback logic
- User explicitly selects environment every time

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: string  # Not choice — dynamic, accepts any environment name
```

## Dynamic Environment Input (not hardcoded list)

**What we learned:**
- `type: choice` with `options: [dev, prod]` is too rigid
- Projects may add environments (test, staging, taste, etc.)
- Use `type: string` input + GitHub's native `environment:` validation
- Do NOT try to validate via GitHub API (`gh api repos/.../environments`) — `GITHUB_TOKEN` lacks repo-level permissions (403)

## Backend API URL per Environment

**What we learned:**
- `VITE_API_BASE_URL` must be set in each GitHub Environment's variables
- Build step uses `vars.API_BASE_URL` (not `secrets` — it's not secret)
- Example: dev environment → `https://dev-nexus-dev-...`, prod → `https://dev-nexus-prod-...`

```yaml
- name: Build Frontend
  run: pnpm build
  env:
    VITE_API_BASE_URL: ${{ vars.API_BASE_URL }}
    VITE_ENV: ${{ github.event.inputs.environment }}
```

## Subagent + Lockfile Drift

**What we learned (2026-08-30 incident followup):**
- An `npm install` step covered by `--legacy-peer-deps` will write a `package-lock.json` even if `.gitignore` rejects it locally — accidental regeneration can land via a subagent dispatch in a way that bypasses the gate.
- Mitigation: `corepack` pinning is the single source of truth; if a contributor or subagent ever reaches for `npm install`, abort the change and re-run via `pnpm install --frozen-lockfile`.

## Dead Workflows to Remove

**Patterns that caused pain:**
- `push:` triggers on deploy workflows → auto-deploy risk
- `claude.yml` / `claude-code-review.yml` — depends on ANTHROPIC_API_KEY, adds noise
- `pre-commit.yml` with `continue-on-error` — masks real failures
- Composite actions with broken YAML (missing `steps:` key)
- `gitleaks/gitleaks-action@v2` — requires a `GITLEAKS_LICENSE` secret the org does not provide, AND strips the `args:` input schema. Replaced by direct CLI install of gitleaks v8.18.0 (matches the pre-commit hook version).

## Summary Checklist

Before first deploy on a new project:

1. [ ] Bootstrap tooling: `corepack enable && pnpm install --frozen-lockfile && pnpm exec pre-commit install`
2. [ ] Create GitHub Environments (`dev`, `prod`, etc.)
3. [ ] Add `CLOUDFLARE_API_TOKEN` to **each** environment's secrets
4. [ ] Add `CLOUDFLARE_ACCOUNT_ID` to **each** environment's variables
5. [ ] Add `API_BASE_URL` to **each** environment's variables
6. [ ] Ensure `src/worker.ts` exists with inline types
7. [ ] Ensure ESLint globals include `Request`, `Response`
8. [ ] Verify `wrangler.toml` has `[assets]` block
9. [ ] Confirm deploy workflow uses `type: string` (not choice)
10. [ ] Confirm deploy job declares `environment:`
11. [ ] Confirm only `pnpm-lock.yaml` is committed; reject `package-lock.json` / `yarn.lock`
