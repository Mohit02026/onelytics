# Onelytics Improvement Plan

Date: 2026-04-29

## Review summary
- Scope reviewed: API routes, auth/middleware, Prisma schema, services, workers, core dashboard pages, env docs, build/lint setup.
- Baseline checks: `npm run lint` and `npm run build` both pass.
- Note: this plan is prioritized by risk (security/data correctness first), then reliability, then maintainability.

## Priority 0 (fix first)

### 1) Remove committed `.env` from Git history and rotate secrets
Why:
- `.env` is tracked by Git, which is a critical secret exposure risk.

Evidence:
- `.env` is tracked: `git ls-files .env` returns `.env`.
- [`.gitignore`](/d:/Onelytics/.gitignore:29) only ignores `.env*.local`, not `.env`.

Actions:
- Add `.env` to `.gitignore`.
- Untrack `.env` and purge from history if already pushed.
- Rotate all exposed secrets (OAuth client secrets, encryption key, DB URL, API keys).

### 2) Enforce invite-email match during invite acceptance
Why:
- Any signed-in user with a valid invite token can currently join, even if their email does not match the invited email.

Evidence:
- Invite includes email in GET response: [`app/api/invite/[token]/route.ts`](/d:/Onelytics/app/api/invite/[token]/route.ts:16).
- POST accept flow does not check `session.user.email` against `invite.email`: [`app/api/invite/[token]/route.ts`](/d:/Onelytics/app/api/invite/[token]/route.ts:22).

Actions:
- Add strict email comparison (case-insensitive) before membership creation.
- Return `403` with clear message on mismatch.

### 3) Enforce workspace role checks on integration mutation APIs
Why:
- Project role policy says Viewer cannot edit integrations, but integration connect/disconnect/config routes only check authentication.

Evidence:
- Role policy in docs: [`README.md`](/d:/Onelytics/README.md:146).
- Example routes only check session, no role/membership checks:
  - [`app/api/integrations/google/connect/route.ts`](/d:/Onelytics/app/api/integrations/google/connect/route.ts:6)
  - [`app/api/integrations/google/disconnect/route.ts`](/d:/Onelytics/app/api/integrations/google/disconnect/route.ts:5)
  - [`app/api/integrations/wordpress/connect/route.ts`](/d:/Onelytics/app/api/integrations/wordpress/connect/route.ts:14)

Actions:
- Add reusable guard using `getMembership` + `canEdit` for all integration write routes.
- Keep analytics read routes viewable by Viewer.

### 4) Fix report data mapping bugs (currently causes incorrect report totals)
Why:
- Report generator expects Google Ads fields that do not exist (`cost`, `conversions`, `costPerConversion`) while Ads service returns `spend`, `clicks`, `impressions`, `cpc`, `roas`.
- This can zero out spend/conversions in generated reports.

Evidence:
- Incorrect field usage in report generator:
  - [`services/reports/generate.ts`](/d:/Onelytics/services/reports/generate.ts:116)
  - [`services/reports/generate.ts`](/d:/Onelytics/services/reports/generate.ts:237)
- Actual Ads overview shape:
  - [`services/google/ads.ts`](/d:/Onelytics/services/google/ads.ts:1)

Actions:
- Align report mapping with actual provider contracts.
- Add provider-normalization layer (adapter) before report aggregation.
- Add unit tests for report mapping.

### 5) Separate GA4 property ID from Google Ads customer ID
Why:
- Google property route enforces `properties/123...`, but Google Ads API requires numeric customer ID; both currently share `ConnectedAccount.propertyId`.
- Real Google Ads fetch can fail while connection appears valid.

Evidence:
- GA4 property validation requires `properties/...`: [`app/api/integrations/google/property/route.ts`](/d:/Onelytics/app/api/integrations/google/property/route.ts:6).
- Ads service expects Google Ads customer ID: [`services/google/ads.ts`](/d:/Onelytics/services/google/ads.ts:38).
- Ads route passes shared `propertyId` into Ads API: [`app/api/analytics/ads/route.ts`](/d:/Onelytics/app/api/analytics/ads/route.ts:68).

Actions:
- Store GA4 property and Ads customer ID in separate fields (or structured `metadata`).
- Add dedicated API + UI input for Google Ads customer ID.
- Return actionable `400` when Ads account ID is missing.

## Priority 1 (next sprint)

### 6) Move long-running report generation to BullMQ job flow
Why:
- Reports are currently generated synchronously in request lifecycle, combining multiple analytics fetches plus AI generation.
- Risk of request timeout and poor UX under load.

Evidence:
- Synchronous generation in POST route: [`app/api/reports/route.ts`](/d:/Onelytics/app/api/reports/route.ts:66).
- Status model already exists (`GENERATING/READY/FAILED`), good fit for async workers: [`prisma/schema.prisma`](/d:/Onelytics/prisma/schema.prisma:171).

Actions:
- POST creates report row + enqueues job.
- Worker updates status/result.
- UI polls status or uses streaming updates.

### 7) Wire BullMQ for real processing (currently placeholder only)
Why:
- Worker exists but is placeholder and not connected to business flows.

Evidence:
- Placeholder comments and console logs in worker: [`workers/bullmq.ts`](/d:/Onelytics/workers/bullmq.ts:4).
- No worker script in package scripts: [`package.json`](/d:/Onelytics/package.json:5).

Actions:
- Add `worker:dev` / `worker:start` scripts.
- Register real processors (GA4 sync, report generation, token refresh jobs).
- Add retry/backoff/dead-letter policy and observability.

### 8) Standardize OAuth callback hardening
Why:
- Cookie handling is inconsistent across providers.
- Connect routes set `HttpOnly` + `SameSite=Lax`, but no `Secure` flag for production.
- Google callback uses custom cookie parsing while others use `cookies()`.

Evidence:
- Cookie set without `Secure`: [`app/api/integrations/google/connect/route.ts`](/d:/Onelytics/app/api/integrations/google/connect/route.ts:15), similar in Meta/TikTok/LinkedIn connect routes.
- Manual parser in Google callback: [`app/api/integrations/google/callback/route.ts`](/d:/Onelytics/app/api/integrations/google/callback/route.ts:6).

Actions:
- Use `cookies()` consistently.
- Set `Secure` when `NODE_ENV === 'production'`.
- Clear state cookie on successful callback for all providers.
- Validate callback query with Zod.

### 9) Add central env schema validation
Why:
- Many `process.env.X!` non-null assertions can fail late at runtime.

Evidence:
- Examples in services/auth files with `!` assertions: [`services/google/auth.ts`](/d:/Onelytics/services/google/auth.ts:9), [`services/meta/auth.ts`](/d:/Onelytics/services/meta/auth.ts:7).

Actions:
- Add `lib/env.ts` with Zod schema.
- Fail fast during startup with explicit messages.
- Validate encryption key length/format explicitly.

### 10) Replace `console.*` in server code with structured logger
Why:
- Project standard says no `console.log` in production code.

Evidence:
- [`workers/bullmq.ts`](/d:/Onelytics/workers/bullmq.ts:12)
- [`app/api/auth/register/route.ts`](/d:/Onelytics/app/api/auth/register/route.ts:55)
- [`app/api/reports/route.ts`](/d:/Onelytics/app/api/reports/route.ts:77)

Actions:
- Add logger utility (pino/winston or thin wrapper).
- Include request/workspace context and error IDs.

## Priority 2 (maintainability and UX)

### 11) Refactor oversized client pages into smaller modules
Why:
- Current files exceed project file-size rule and are hard to maintain.

Evidence:
- [`app/(dashboard)/connect/page.tsx`](/d:/Onelytics/app/(dashboard)/connect/page.tsx) ~768 lines.
- [`app/(dashboard)/settings/members/page.tsx`](/d:/Onelytics/app/(dashboard)/settings/members/page.tsx) ~364 lines.

Actions:
- Split into feature components + hooks (`useIntegrationStatus`, `useOAuthConnect`, `useInviteMembers`).
- Keep API calls in dedicated client-side service layer.

### 12) Consolidate duplicated token-refresh/cache logic
Why:
- Similar resolver logic is repeated across GA4/Ads/GSC/Unified routes.
- Duplication increases bug surface.

Evidence:
- Repeated resolver functions:
  - [`app/api/analytics/ga4/route.ts`](/d:/Onelytics/app/api/analytics/ga4/route.ts:14)
  - [`app/api/analytics/ads/route.ts`](/d:/Onelytics/app/api/analytics/ads/route.ts:13)
  - [`app/api/analytics/gsc/route.ts`](/d:/Onelytics/app/api/analytics/gsc/route.ts:13)
  - [`app/api/analytics/unified/route.ts`](/d:/Onelytics/app/api/analytics/unified/route.ts:20)

Actions:
- Create shared helpers for token resolution, cache read/write, and date validation.
- Keep route handlers thin and consistent.

### 13) Add stronger date validation rules
Why:
- Current validation checks format only, not logical correctness (`start <= end`, range limits).

Evidence:
- Analytics schemas rely on regex-only date checks, e.g. [`app/api/analytics/ga4/route.ts`](/d:/Onelytics/app/api/analytics/ga4/route.ts:9).

Actions:
- Use Zod refinements for date order and max range (for API cost control).

### 14) Clean up env templates and docs drift
Why:
- Both `.env.example` and `env.example` exist and conflict on OAuth callback paths.

Evidence:
- `env.example` uses old `/api/auth/callback/*` comments: [`env.example`](/d:/Onelytics/env.example:26).
- `.env.example` uses current `/api/integrations/*/callback` comments: [`.env.example`](/d:/Onelytics/.env.example:26).

Actions:
- Keep a single canonical `.env.example`.
- Remove or archive stale `env.example`.

### 15) Update connection status UX logic
Why:
- Sidebar connection counter is hardcoded to `/3` even though more integrations exist.

Evidence:
- Hardcoded count logic and badge: [`components/sidebar.tsx`](/d:/Onelytics/components/sidebar.tsx:47), [`components/sidebar.tsx`](/d:/Onelytics/components/sidebar.tsx:108).

Actions:
- Make counter dynamic from available integrations list.
- Distinguish "connected" vs "configured" consistently across UI.

### 16) Add test coverage and CI gates
Why:
- No test suite is present, increasing regression risk for security and data mapping.

Evidence:
- No `test` script in [`package.json`](/d:/Onelytics/package.json:5).

Actions:
- Unit tests: encryption utils, OAuth state validation, report mapping.
- Integration tests: key API routes with workspace scoping and role permissions.
- CI gates: lint, typecheck, tests, migration checks.

## Suggested implementation order
1. Secrets hygiene (`.env` untracking + rotation).
2. Invite-email enforcement and role guards on integration mutations.
3. Report mapping fix + Google Ads ID model fix.
4. Async report generation + real BullMQ wiring.
5. Shared API helpers, page refactors, and test/CI rollout.
