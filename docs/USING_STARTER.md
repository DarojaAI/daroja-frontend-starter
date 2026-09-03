# Using `daroja-frontend-starter`

> Reusable-knowledge template for downstream projects. Generated projects should treat this doc as the adopt-or-deviate contract.

This doc captures the org's current best understanding of how a frontend project generates from this starter, what it inherits, what it cannot change, and how to keep it healthy. The starter's job is to capture the *latest and greatest* knowledge — when the org learns a new lesson, the canonical place for it is here, not scattered in a Slack thread.

## 1. Adopt quick-start

```bash
# 1. Fork/copy the repo (treat it as a template, not a parent)
cp -r daroja-frontend-starter my-new-frontend
cd my-new-frontend

# 2. Replace placeholders
$EDITOR package.json            # update `name`, `description`, repo URL
$EDITOR README.md               # replace template narrative

# 3. Bootstrap pnpm (corepack is the canonical install path)
corepack enable
corepack prepare pnpm@latest --activate

# 4. Install dependencies (frozen lockfile)
pnpm install --frozen-lockfile

# 5. Install pre-commit hooks (mirrors CI gates)
pnpm exec pre-commit install

# 6. Develop
pnpm dev

# 7. First commit (pre-commit will run Prettier, ESLint, gitleaks, yaml checks)
git commit -m "chore: init from daroja-frontend-starter"
```

## 2. What you inherit (do not change)

| Surface | Inherited value | Rationale |
|---|---|---|
| `packageManager` (package.json) | `pnpm@9.12.0` (corepack-pinned) | Org-wide pnpm-only policy. Mirrors `dev-nexus-frontend` #124. |
| `engines.node` | `>=20.19.0` | Required by Vite 8 + ESLint v10. |
| `STARTER_ALIASES` | `'@' → '/src'`, `'@api' → '/src/api'` | §8.1 lock. Downstream projects extend but do not redefine. |
| `STARTER_SOURCEMAP` | `true` | Production sourcemaps are required for incident triage. |
| Lockfile | `pnpm-lock.yaml` only | `package-lock.json` / `yarn.lock` must be `.gitignore`'d (CI rejects). |
| `src/worker.ts` | Cloudflare Workers + Static Assets | Pages-vs-Workers posture is settled (see `DEPLOYMENT_LESSONS.md`). |
| ESLint config | Flat config (v10), warnings-as-errors | Drop `--ext` from the script — eslint v8+ replaces it. |
| `vite.config.ts` | `appType: 'spa'`, `bundleAnalyzer()` opt-in | The `dist/stats.html` analyzer is *not* enabled by default. |
| §8.1 stdlib path | `@api/envelope` → `src/api/envelope.ts` | Downstream apps import the predicate from here, not inline. |

## 3. Stays as-is (the canonical contracts)

- **Envelope detection** — `src/api/envelope.ts` exports `isLyingEnvelope({ body, status, headers })`. Use this from your API client layer (typically wrapping `axios` or `fetch`). Pure function, no I/O, no logging. Tests in `src/api/envelope.test.ts`.
- **Brand tokens** — The four-accent system (`gold`, `azure`, `green`, `red`). Accent swap is a runtime `data-accent` change on `<html>`. Do not extend the token set locally — request a brand token upstream.
- **Cloudflare WAF posture** — Static-asset Worker, no Workers for Platforms, no Tail Workers. The deploy does one thing.

## 4. Customize per-project (allowed changes)

- **`name` + `description` + repo URL** in `package.json` — replace placeholders.
- **Project-specific aliases on top of `STARTER_ALIASES`** — e.g. add `'@components'` pointing to `src/components`. Spread + override, do not redefine the canonical two.
- **Source map toggle** — set `STARTER_SOURCEMAP = false` if the project has a legal reason (rare). Sourcemap false mitigates nothing actually — prefer true.
- **`wrangler.toml` defaults** — change `main`, `compatibility_date`. Generated downstream projects usually leave this template as-is and let `deploy.yml` regen `wrangler.{env}.toml` per environment.

## 5. CI / pre-commit pipeline (mirrored)

The starter ships mirrored local + remote gates. CI catches what the local hook could not.

| Check | Local | CI |
|---|---|---|
| Prettier | `.pre-commit-config.yaml` | `.github/workflows/ci.yml` runs `pnpm build` (which includes `tsc`) |
| ESLint (warnings-as-errors) | `pnpm lint --max-warnings 0` (pre-commit local hook) | `DarojaAI/infra-actions/tool/check/eslint@main` |
| `tsc --noEmit` | (vitest covers most cases) | `DarojaAI/infra-actions/tool/check/typescript@main` |
| Vitest run | `pnpm test` (watch) | `DarojaAI/infra-actions/tool/check/vitest@main` |
| pnpm-audit (production-only, moderate+) | manual `pnpm audit --prod` | `DarojaAI/infra-actions/tool/check/pnpm-audit@main` |
| gitleaks secret scan | `.pre-commit-config.yaml` | `.github/workflows/gitleaks.yml` |

Do not bypass these by adding `--no-verify` to a commit or merging with a red check. The reason these are mirrored is that the local hook can be skipped on a contributor machine.

## 6. Deploy

See [DEPLOY.md](../DEPLOY.md). Short version:

1. Create GitHub Environment(s) in repo Settings; one per deploy target (`dev`, `prod`, etc.).
2. Per environment: secret `CLOUDFLARE_API_TOKEN`, var `CLOUDFLARE_ACCOUNT_ID`, var `API_BASE_URL`.
3. From Actions → "Deploy Frontend" → Run workflow → enter environment.
4. Watch the `checks` job pass, then the `deploy` job succeed.
5. Worker URL: `<repo-name>-<env>.<acct>.workers.dev`.

Common-failure recovery is in [DEPLOYMENT_LESSONS.md](../DEPLOYMENT_LESSONS.md) — read it BEFORE first deploy on a new project.

## 7. When to push back upstream

If you encounter a bug in starter code (envelope predicate, vite config, theme bridge), propose a fix here:

```bash
# from the downstream project
cd $UPSTREAM/daroja-frontend-starter
git checkout -b fix/<slug>
# reproduce + test the downstream scenario, write the fix, add a test.
# The §8.1 envelope predicate has 10 pinned tests; new edge cases need new pin tests.
```

If you encounter a deploy/CI failure that isn't in [DEPLOYMENT_LESSONS.md](../DEPLOYMENT_LESSONS.md), append to it *in the same PR that triggered the failure*. The runbook discipline says: lessons learn at first failure, get codified by the second.

If you want to add a new feature to the stdlib (e.g. a `validResponse()` predicate mirroring `validEnvelope()`), open an §8.x issue first — stdlib surface changes need §8 cross-coordination because downstream projects pin their imports.

## 8. What *not* to do

- Don't `npm install` ever. Even once for debugging. It writes `package-lock.json` and CI will reject and you'll have to clean up. Use `pnpm` for everything.
- Don't add a `packageManager: npm@x.y.z` override. Corepack is the source of truth.
- Don't install `@cloudflare/workers-types` — it conflicts with Node types and the Worker is small enough for inline types.
- Don't redefine `STARTER_ALIASES` (`@`, `@api`). Do extend them.
- Don't create a wrapper library that makes envelope detection non-pure. Pure functions only.
- Don't disable gitleaks CI to "merge faster." Secret leaks are why `.pre-commit-config.yaml` exists.
- Don't hand-author a `wrangler.{env}.toml` — it's regenerated by `deploy.yml` for every deploy.

## 9. References

- **§RFC #2** Phase 2 — templates adopt the new Shared Libraries & Templates standards (`DarojaAI/.github#2`).
- **§8.1** stdlib — `src/api/envelope.ts` (`DarojaAI/dev-nexus#1448`).
- **Mirror**: dev-nexus-frontend current state (PR #135 sync).
- **MUI brand-token bridge** — `src/theme/mui-theme.ts` and `DarojaAI/design-artifacts`.
