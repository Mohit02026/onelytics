# Issues Log

---

## Session: 2026-04-28 — Phase 2 (Dummy Data)

### Issue 1: DATABASE_URL localhost not resolving on Windows + Docker
**Problem:** `npx prisma migrate dev` failed with `P1001: Can't reach database server at localhost:5432` even though Docker containers were running and port 5432 was open.

**Tried:**
- Verified containers were running (`docker ps` showed both postgres + redis up)
- Ran migration from bash — failed
- Ran migration from PowerShell — failed

**Fix:**
Changed `DATABASE_URL` in `.env` from `localhost` to `127.0.0.1`. Windows resolves `localhost` to `::1` (IPv6) in some shell contexts, but the Docker socket only binds to `127.0.0.1` (IPv4). Migration succeeded immediately after this change.

---

### Issue 2: docker command not found in bash
**Problem:** `docker compose up -d` returned `command not found` in bash tool.

**Tried:**
- `docker --version` in bash — not found
- `where docker` — not found

**Fix:**
Docker Desktop on Windows is installed at `C:\Program Files\Docker\Docker\resources\bin\docker.exe` but not added to bash PATH. Use PowerShell with full path:
```
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose -f D:\Onelytics\docker-compose.yml up -d
```

---

### Issue 3: Prisma 7 — PrismaClient constructor fails with no-args
**Problem:** `new PrismaClient()` threw `PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`.

**Tried:**
- Added `import 'dotenv/config'` to `lib/db.ts` — same error
- Set `$env:DATABASE_URL` explicitly before build — same error
- Passed `{ errorFormat: 'colorless' }` — different error: "Using engine type 'client' requires adapter or accelerateUrl"
- Set `engineType = "library"` in schema generator — still failed (native binary not installed)

**Root Cause:**
Prisma 7 dropped native engine binaries entirely. The new default engine type is `"client"` which requires either a driver adapter (`@prisma/adapter-pg`, etc.) or Prisma Accelerate. `new PrismaClient()` without an adapter is no longer valid in Prisma 7.

**Fix:**
Installed `@prisma/adapter-pg` + `pg` + `@types/pg`. Updated `lib/db.ts`:
```typescript
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
```
Build passed cleanly after this.

---

### Issue 4: `asChild` prop not recognized on Base UI components
**Problem:** TypeScript errors on `<Button asChild>`, `<DropdownMenuTrigger asChild>`, `<DropdownMenuItem asChild>` — all from shadcn/ui components built on `@base-ui/react`.

**Tried:**
- Nothing — identified from TypeScript check output

**Fix:**
Base UI uses `render` prop for polymorphism, not `asChild`. Examples:
- `<Button render={<Link href="..." />}>text</Button>` for link buttons
- `<DropdownMenuTrigger>` — just put content directly inside, no asChild needed
- `<DropdownMenuItem onClick={() => router.push(...)}>` — use click handlers instead of asChild

---

### Issue 5: `datasourceUrl` not in Prisma 7 TypeScript types
**Problem:** Pre-existing TypeScript error: `'datasourceUrl' does not exist in type 'Subset<PrismaClientOptions, PrismaClientOptions>'`.

**Root Cause:** Prisma 7 removed `datasourceUrl` from `PrismaClientOptions` type. Datasource configuration is now done via `prisma.config.ts` (for CLI) or driver adapter (for runtime).

**Fix:** Switched to `@prisma/adapter-pg` driver adapter which completely replaces the need for `datasourceUrl` in the constructor.

---

## Session: 2026-04-28 — Phase 2 Real OAuth + Phase 3 Google Ads

### Issue 6: useSearchParams Suspense error persists despite force-dynamic
**Problem:** `next build` failed with `useSearchParams() should be wrapped in a suspense boundary at page "/connect"` even after `export const dynamic = 'force-dynamic'` was added to the top of the file.

**Tried:**
- Added `export const dynamic = 'force-dynamic'` as the first export after `'use client'` — same build error

**Root Cause:**
In Next.js 14, `force-dynamic` prevents static generation of the page but does NOT suppress the Suspense requirement for `useSearchParams` during the static generation prerender pass. The hook still needs a Suspense boundary regardless of the dynamic setting.

**Fix:**
Renamed the component to `ConnectPageInner`, added `Suspense` to the imports, and wrapped it in a default export:
```tsx
export default function ConnectPage() {
  return (
    <Suspense>
      <ConnectPageInner />
    </Suspense>
  )
}
```
Build passed cleanly after this change.

---

### Issue 7: Recharts tooltip formatter TypeScript type mismatch
**Problem:** TypeScript error in `ads-spend-chart.tsx` and `traffic-sources-chart.tsx`:
```
Type '(value: number, name: string) => ...' is not assignable to type 'Formatter<...>'
```
because Recharts types the `value` parameter as `number | string | (number | string)[]` not `number`.

**Tried:**
- Added explicit `: number` type on `value` parameter — TypeScript error

**Fix:**
Removed explicit type annotation and cast inside the function:
```tsx
formatter={(value, name) => [
  name === 'spend' ? `$${Number(value).toFixed(2)}` : Number(value).toLocaleString(),
  name === 'spend' ? 'Spend' : 'Clicks',
]}
```
`Number(value)` safely coerces the union type and satisfies TypeScript.

---

### Issue 8: Google Ads customer ID storage
**Decision:** Google Ads customer ID is stored in `ConnectedAccount.propertyId` field (same field as GA4 Property ID). This works because both GA4 and Ads share a single `ConnectedAccount` row per workspace keyed by `provider = 'google'`. The `propertyId` field holds GA4 Property ID for the GA4 service and Ads Customer ID for the Ads service — they're set separately via different UI prompts. No schema change needed.

---

## Session: 2026-04-28 — Phase 4 (Search Console + WordPress)

### Issue 9: Prisma client types not updated after schema migration
**Problem:** After adding `metadata Json?` to `ConnectedAccount` schema and running `prisma migrate dev`, TypeScript errors appeared on `account.metadata` — `Property 'metadata' does not exist on type ...`. The Prisma migration ran successfully but the generated client wasn't updated.

**Tried:**
- Nothing — identified from `npx tsc --noEmit` output

**Fix:**
Ran `npx prisma generate` after the migration to regenerate the Prisma client with the new field. TypeScript errors cleared immediately after regeneration.

**Lesson:** After any `prisma migrate dev`, always run `prisma generate` explicitly. The migrate command does trigger generation but in this case the background migration completed before the TypeScript check and the client wasn't regenerated in the right context.

---

### Issue 10: GSC site URL storage strategy
**Decision:** GSC site URL is stored in `metadata.gscSiteUrl` JSON field on the `provider = 'google'` ConnectedAccount row. This avoids creating a separate provider row and keeps token management in one place. The `metadata Json?` field was added to `ConnectedAccount` to support per-integration config without breaking the existing `propertyId` field used for GA4 + Ads.

---

### Issue 11: WordPress credentials storage pattern
**Decision:** WordPress uses a separate `provider = 'wordpress'` ConnectedAccount row. Credentials (base64 of `user:appPassword`) are encrypted with AES-256-GCM and stored in `accessToken`. Site URL is stored in `propertyId`. This mirrors the Google OAuth pattern but uses Basic Auth instead of Bearer tokens. No refresh token needed (application passwords don't expire).

---

## Session: 2026-04-28 — Phase 5 (Meta Ads)

### Issue 12: ESLint unused import in API route — same pattern as Phase 3/4
**Problem:** `next build` failed with `'DUMMY_TOKEN' is defined but never used` in `/api/analytics/meta/route.ts`. The import was included for symmetry with other routes but the value isn't needed since `getMetaReport` handles the routing internally.

**Fix:** Removed `DUMMY_TOKEN` from the import line — only import `getMetaReport`. Same fix applied in previous phases for `DUMMY_CREDENTIALS` (wordpress route) and `DUMMY_TOKEN` (ads route). Pattern: never import sentinel constants into API routes — keep them encapsulated in the service layer.

---

### Issue 13: Meta token refresh strategy
**Decision:** Meta access tokens from OAuth are long-lived (~60 days). Unlike Google tokens, there's no standard refresh token flow for system users. For Phase 5, no token refresh is implemented — the user will need to re-authenticate after ~60 days. This is acceptable for MVP. Long-term: use `GET /oauth/access_token?grant_type=fb_exchange_token` to extend tokens before expiry.

---

## Session: 2026-04-28 — Phase 6 (Unified View + AI)

### Issue 14: Unified API parallel data fetching with graceful degradation
**Decision:** `/api/analytics/unified` fetches from all 4 sources (GA4, Ads, GSC, Meta) using `Promise.allSettled` — if any source fails or isn't connected, it returns `null` for that source rather than failing the whole request. The dashboard renders whatever data is available. This means a partially-connected workspace still sees a useful unified view.

### Issue 15: AI summary model choice
**Decision:** Using `claude-haiku-4-5-20251001` (not Sonnet) for the AI summary. The summary is a short 2-3 sentence paragraph + 3 bullets — Haiku is fast enough and cheaper for this use case. The route returns 503 gracefully if `ANTHROPIC_API_KEY` is not set, so the widget degrades cleanly in dev without credentials.

---

## Session: 2026-04-29 — Phase 7 (Agency Features)

### Issue 16: Base UI Select API differences from shadcn/Radix
**Problem:** Created `components/ui/select.tsx` using `@base-ui/react/select` but used wrong sub-components: `SelectPrimitive.Viewport` (doesn't exist in Base UI) and `asChild` prop (doesn't exist in Base UI).

**Fix:**
- `Viewport` → `List` (`SelectPrimitive.List`)
- `asChild` pattern → not needed; wrap children directly
- `Select.Root.Props` requires generic type argument: `Select.Root.Props<string>`
- `onValueChange` signature: `(value: string | null, eventDetails) => void` — must handle `null`
  Pattern: `onValueChange={(v) => v && setVal(v)}`

---

### Issue 17: Base UI AlertDialog — no asChild support
**Problem:** `<AlertDialogTrigger asChild>` caused TypeScript error — Base UI's `AlertDialog.Trigger` doesn't accept `asChild`.

**Fix:** Removed `asChild` — wrap `<Button>` inside the trigger directly. Base UI forwards the click event from trigger to the dialog root.

---

### Issue 18: Phase 7 lazy OWNER migration strategy
**Decision:** Rather than running a data migration SQL script to create `WorkspaceMember` rows for all existing users, `getMembership()` in `lib/workspace.ts` auto-creates an OWNER entry on first access if: (a) the user exists, (b) `user.workspaceId` matches the requested `workspaceId`, and (c) no `WorkspaceMember` row exists yet. This is safe because it only creates one row per user per request, is idempotent across concurrent requests (uses upsert), and requires no downtime.

---

## Session: 2026-04-29 — Phase 8 (TikTok + LinkedIn)

### Issue 19: LinkedIn Ad Analytics API account ID format
**Decision:** LinkedIn API requires account IDs in URN format: `urn:li:sponsoredAccount:XXXXXXXXXX`. The raw numeric ID is stored in `ConnectedAccount.propertyId` and the URN is constructed in the analytics route: `urn:li:sponsoredAccount:${account.propertyId}`. This keeps the stored value clean and portable.

### Issue 20: TikTok token refresh vs Meta long-lived
**Decision:** TikTok tokens expire after 24 hours (unlike Meta's ~60 days). A refresh flow is implemented in `services/tiktok/auth.ts` using `refreshAccessToken()` and called in `/api/analytics/tiktok` when the token expires within 1 hour. The refresh token itself is valid for ~1 year. LinkedIn tokens are ~60 days (same as Meta) — no refresh implemented for MVP.

---

## Session: 2026-04-29 — Phase 9 (Client Reports)

### Issue 21: Lucide-react v1.11.0 missing Linkedin icon
**Problem:** `Linkedin` icon is not exported from `lucide-react` v1.11.0, causing TypeScript errors in sidebar, connect page, and linkedin-ads page.

**Fix:** Replaced `Linkedin` with `Briefcase` icon across all usages. The square icon with a briefcase is a reasonable LinkedIn-adjacent replacement for MVP. Long-term: upgrade lucide-react to a version that includes the Linkedin icon.

---

### Issue 22: Report generation architecture
**Decision:** Reports are generated synchronously (not as background jobs) via the POST `/api/reports` handler. It:
1. Creates a `GENERATING` row in the DB
2. Calls `generateReport()` which uses the user's session cookie to call internal analytics APIs
3. Updates the row to `READY` with the full JSON payload

This uses caching from analytics routes — if data is cached (6hr TTL) generation is fast. If cold, it may take 10-30 seconds for 4 channels. For Phase 10, background job generation via BullMQ should be considered.

---

### Issue 23: Report uses internal API calls with cookie forwarding
**Decision:** `generateReport()` calls internal analytics routes (`/api/analytics/meta`, etc.) via `fetch` with the user's `Cookie` header forwarded. This reuses all the existing auth + caching + data fetching logic without duplication. The `NEXTAUTH_URL` env var must be set correctly for this to work in production.

---

## Session: 2026-04-29 — OAuth hardening + UX improvements

### Issue 24: `Response.json().headers.set('Set-Cookie')` silently fails in Next.js App Router
**Problem:** OAuth state cookies were never reaching the browser. The connect routes used `Response.json({url}).headers.set('Set-Cookie', ...)` which appeared to work but the cookie was never sent.

**Root Cause:** Standard `Response` headers are immutable after construction in the Fetch API spec. Next.js App Router enforces this — `headers.set()` on a `Response` silently no-ops instead of throwing.

**Fix:** Switched all 4 OAuth connect routes and the Google callback route to `NextResponse.json()` + `res.cookies.set(...)`. `NextResponse` extends `Response` with a mutable cookies API that correctly sets `Set-Cookie` headers on the outgoing response.

---

### Issue 25: `auth()` returning null — 401 on all API routes despite being logged in
**Problem:** Every API route returned 401 Unauthorized even with a valid session cookie present. `auth()` internally makes a fetch to `http://localhost:3000/api/auth/session` to validate the JWT, and this was failing.

**Root Cause:** On Windows, `localhost` resolves to `::1` (IPv6) in Node.js, but Next.js dev server listens on `127.0.0.1` (IPv4). The internal `auth()` fetch was going to `::1:3000` which had no listener.

**Fix:**
- Changed `NEXTAUTH_URL` from `http://localhost:3000` to `http://127.0.0.1:3000`
- Added `AUTH_URL=http://127.0.0.1:3000` and `AUTH_TRUST_HOST=true`
- Added `trustHost: true` to `authConfig` in `auth.config.ts`

---

### Issue 26: Logout requires two clicks with CredentialsProvider + NextAuth v5
**Problem:** Clicking "Log out" once redirected to `/login` but the user was still authenticated — a second click was needed to fully clear the session.

**Root Cause:** `signOut({ callbackUrl: '/login' })` clears the cookie then redirects, but the middleware's `authorized` callback sees the stale cached session on the first page load after redirect.

**Fix:** Changed navbar logout to `await signOut({ redirect: false })` then `router.push('/login')` + `router.refresh()`. The `router.refresh()` forces Next.js to re-run server components and middleware with the cleared session.

---

### Issue 27: Google Ads incorrectly showed "Connected" after Google OAuth
**Problem:** After connecting Google OAuth (for GA4), the Google Ads card on the connect page also showed "Connected" even though no Ads customer ID had been configured.

**Root Cause:** `getConnectedStatus('google-ads')` returned `status.google` — just checking whether the OAuth token existed, not whether a customer ID was saved.

**Fix:** Added `googleAdsCustomerId` field stored in `ConnectedAccount.metadata`. Status API now returns it. `getConnectedStatus('google-ads')` requires `status.google && !!status.googleAdsCustomerId`. Added new route `/api/integrations/google/ads-customer` to save the customer ID.

---

### Issue 28: All Google services showed setup prompts at once after OAuth
**Problem:** After connecting Google OAuth, the connect page showed three banners simultaneously (GA4 property ID, Search Console site URL, Google Ads customer ID), which was confusing.

**Fix:** Redesigned to intent-first connect flow:
- Each Google service card (GA4, Ads, GSC) has its own Connect button
- First click on any card runs Google OAuth with the target service encoded in the state: `state = "${service}:${csrf}"`
- Callback decodes the service from state, redirects with `?service=ga4|gsc|ads`
- Page opens an inline picker only for the service that was clicked
- Subsequent clicks (token already stored) skip OAuth entirely and open the picker directly

---

### Issue 29: GA4 property and Search Console site required manual text entry
**Problem:** After OAuth, users had to manually type their GA4 property ID (`properties/XXXXXXXXX`) and Search Console site URL — error-prone.

**Fix:** Added two new API routes:
- `GET /api/integrations/google/ga4-properties` — calls `analyticsadmin.googleapis.com/v1beta/accountSummaries`, returns list of `{id, name, account}`
- `GET /api/integrations/google/gsc-sites` — calls `webmasters.googleapis.com/v3/sites`, returns verified sites

Connect page now shows a `<select>` dropdown populated from the API. User picks from their real properties/sites instead of typing.

Google Ads customer ID still uses manual input — Google Ads API requires a separate developer token approval.

---

### Issue 30: WordPress page showed "Failed" — no error handling in analytics route
**Problem:** `/app/(dashboard)/wordpress` showed "Failed to load WordPress data" with no useful information.

**Root Cause:** `getWpReport()` in the route had no try-catch. Any WordPress API error caused an unhandled 500 which the page treated as a generic failure.

**Fix:** Wrapped `getWpReport()` in try-catch in the route. Returns `401` for credential errors, `502` for API errors. WordPress page now shows "credentials invalid" state (with a Reconnect button) for 401, and a more specific error message for other failures.

---

### Issue 31: WordPress data showed all zeros
**Problem:** After successfully connecting WordPress, all overview counts (posts, published, drafts, comments) showed 0.

**Root Cause:** The API query filtered posts by `after=${startDate}&before=${endDate}`. The `X-WP-Total` header (used for totalPosts count) reflected the count within the date range, not the site total. A school site with no posts in the last 30 days returned 0 for everything.

**Fix:** Changed to separate parallel API calls for site-wide counts (no date filter):
- `GET /wp-json/wp/v2/posts?per_page=1&status=publish` → `X-WP-Total` = total published
- `GET /wp-json/wp/v2/posts?per_page=1&status=draft` → `X-WP-Total` = total drafts
- `GET /wp-json/wp/v2/comments?per_page=1` → `X-WP-Total` = total comments
- Recent posts table uses `orderby=date&order=desc` with no date filter

---

### Issue 32: WordPress connect accepted `/wp-admin` URL instead of site root
**Problem:** User entered `https://abilityschoolnj.org/wp-admin` as the site URL. This was stored as-is, causing all REST API calls to go to `https://abilityschoolnj.org/wp-admin/wp-json/...` which returns 404.

**Fix:** Added URL normalization in the WordPress connect route:
```typescript
const normalizedUrl = siteUrl.replace(/\/$/, '').replace(/\/(wp-admin|wp-login\.php|wp-json)(\/.*)?$/, '')
```
Now accepts any WordPress URL format and strips admin/API path suffixes before storing.

---

### Issue 33: Date range picker only had 3 presets (7/30/90 days)
**Fix:** Rewrote `components/analytics/date-range-picker.tsx` with 9 presets (Last 7, 14, 30, 90 days, Last 6 months, This month, Last month, This year, Last year) plus a custom range section with two native `<input type="date">` fields. All analytics pages automatically got the upgrade since they all import from this component.

---

## Session: 2026-04-29 — GA4 cards zero fix

### Issue 34: GA4 overview cards showed 0 on the unified dashboard
**Problem:** Sessions, Users, Bounce Rate, Avg Session cards on the main dashboard (`/`) all showed 0 even though the chart (daily sessions) rendered correctly.

**Root Cause:** The GA4 Data API only populates the `totals` field in its response when `metricAggregations: ["TOTAL"]` is included in the request body. Without it, `dailyData.totals` is `undefined`. The chart worked because it uses per-row `daily` data (not totals). The overview values fell back to `?? 0`.

**Fix:** Added `metricAggregations: ['TOTAL']` to the daily report request in `services/google/ga4.ts`.

---

### Issue 35: GA4 overview cards showed 0 on the GA4 individual page after the fix
**Problem:** After adding `metricAggregations: ['TOTAL']` to the GA4 service, the individual GA4 page (`/ga4`) still showed zeros in the overview cards.

**Root Cause:** The `/api/analytics/ga4` route has a 6-hour cache. The cache entries stored before the fix had `overview.sessions = 0`. The route served the stale cached response instead of re-fetching.

**Fix:** Manually deleted all `analytics_cache` rows where `provider = 'ga4'` via `psql` on the Docker postgres container:
```sql
DELETE FROM analytics_cache WHERE provider = 'ga4';
```
On next page load the route fetched fresh data with the correct `metricAggregations` included.

---

### Issue 36: Unified dashboard Ads call used wrong field for customer ID
**Problem:** After the intent-first connect flow redesign (Issue 27), Google Ads customer ID was moved to `metadata.googleAdsCustomerId`. But the unified route still read it from `googleAccount.propertyId`, which now holds the GA4 Property ID.

**Root Cause:** The unified route predated the metadata migration and wasn't updated when `propertyId` usage was split.

**Fix:** Updated `app/api/analytics/unified/route.ts` to read `(googleAccount.metadata as Record<string,string>)?.googleAdsCustomerId ?? ''`. The Ads fetch is now correctly skipped when no customer ID is saved.
