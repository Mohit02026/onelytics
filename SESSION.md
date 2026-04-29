# Session Context

## Update This Every Session
> Before starting work, update this file with today's goal.
> Tell the agent: "Read AGENTS.md and SESSION.md before we start"

---

## Current Session Goal
_Phase 9: Client Reports — complete._

---

## Current Phase
**Phases 7, 8, 9 complete this session. Phase 10 (PDF export + branding) is next.**

## Phase 1 Tasks
- [x] Scaffold Next.js 14 project with TypeScript + Tailwind + shadcn/ui
- [x] Set up docker-compose.yml for local Postgres + Redis
- [x] Initialize Prisma with base schema (users, workspaces)
- [x] Set up NextAuth.js with email/password login
- [x] Workspace auto-created on signup
- [x] Build middleware to protect all dashboard routes
- [x] Set up Redis client and BullMQ worker
- [x] Add rate limiting middleware
- [x] Dashboard layout shell — sidebar, navbar, empty states
- [x] Connect Accounts page skeleton
- [x] Settings page skeleton
- [x] Write .env.example with all required variables

## Phase 2 Tasks (Dummy Data)
- [x] Add ConnectedAccount + AnalyticsCache to Prisma schema
- [x] Run migration phase2_connected_accounts
- [x] Create lib/encryption.ts (AES-256-GCM)
- [x] Create services/google/ga4.ts (dummy data service)
- [x] Create workers/ga4-sync.ts (BullMQ job skeleton)
- [x] API: POST /api/integrations/google/connect
- [x] API: POST /api/integrations/google/disconnect
- [x] API: GET /api/integrations/status
- [x] API: GET /api/analytics/ga4 (with 6-hr cache)
- [x] Component: DateRangePicker (7/30/90 day presets)
- [x] Component: Ga4OverviewCards (sessions, users, bounce rate, avg session)
- [x] Component: SessionsChart (recharts line chart)
- [x] Component: TrafficSourcesChart (recharts horizontal bar)
- [x] Page: /ga4 — full dashboard with skeleton loading + not-connected state
- [x] Updated /connect page — real connect/disconnect with loading states
- [x] Updated sidebar — live connection count dot
- [x] Fixed navbar — Base UI render prop compatibility
- [x] Fixed Prisma 7 — switched to @prisma/adapter-pg driver adapter
- [x] Build passing — TypeScript clean, next build success

## Phase 2 Tasks (Real OAuth — COMPLETE this session)
- [x] Create services/google/auth.ts (OAuth URL builder, code exchange, token refresh)
- [x] Update connect route — GET returns OAuth URL, redirect flow
- [x] Create callback route — CSRF state cookie, code exchange, encrypt + upsert tokens
- [x] Create property route — save GA4 property ID (POST /api/integrations/google/property)
- [x] Update services/google/ga4.ts — real GA4 Data API calls via analyticsdata.googleapis.com
- [x] Update /api/analytics/ga4 — resolveAccessToken (expiry check + refresh), real vs dummy routing
- [x] Update connect page — OAuth redirect, property ID input UI, toast notifications
- [x] Update .env.example — GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, correct callback URL

## Phase 3 Tasks (Google Ads — COMPLETE this session)
- [x] Create services/google/ads.ts — GAQL searchStream queries, dummy + real data
- [x] Create /api/analytics/ads route — same token/cache pattern as GA4
- [x] Component: AdsOverviewCards (Spend, Clicks, Impressions, ROAS)
- [x] Component: AdsSpendChart (AreaChart daily spend/clicks)
- [x] Component: AdsCampaignsTable (campaigns with ROAS color coding)
- [x] Page: /google-ads — full dashboard with skeleton + not-connected state
- [x] Build: TypeScript clean, next build passing

## Last Completed
Phase 2 real OAuth infrastructure + Phase 3 Google Ads dashboard both complete.
Dummy token pattern: DUMMY_TOKEN = 'dummy_access_token' sentinel routes to fake data.
Real OAuth flow: /connect → Google OAuth → /api/integrations/google/callback → /connect?google=connected.

## Key Issues Resolved This Session
- useSearchParams Suspense boundary required even with force-dynamic — wrap inner component
- Recharts tooltip formatter type: use Number(value) cast instead of typed `value: number`
- Google Ads customer ID stored in ConnectedAccount.propertyId field (reused between GA4 + Ads)

## Phase 4 Tasks (Search Console + WordPress — COMPLETE this session)
- [x] Schema: add `metadata Json?` to ConnectedAccount (migration: phase4_metadata)
- [x] Regenerated Prisma client
- [x] Update auth.ts scopes — add webmasters.readonly
- [x] Create services/google/gsc.ts — GSC service with real API + dummy data
- [x] Create services/wordpress/index.ts — WordPress REST API + dummy data
- [x] Create /api/analytics/gsc route — same token/cache pattern
- [x] Create /api/analytics/wordpress route — Basic Auth credentials pattern
- [x] Create /api/integrations/google/gsc-site route — save site URL to metadata
- [x] Create /api/integrations/wordpress/connect and disconnect routes
- [x] Update /api/integrations/status — add gsc, wordpress, gscSiteUrl, wpSiteUrl
- [x] Components: GscOverviewCards, GscClicksChart, GscKeywordsTable
- [x] Components: WpOverviewCards, WpPostsTable
- [x] Pages: /search-console, /wordpress — full dashboards with skeleton + not-connected
- [x] Updated connect page — GSC site URL prompt, WordPress inline form
- [x] Updated sidebar — WordPress nav + Globe icon, connection count /5

## Phase 5 Tasks (Meta Ads — COMPLETE this session)
- [x] Create services/meta/auth.ts — OAuth URL, token exchange (60-day long-lived tokens)
- [x] Create services/meta/ads.ts — Marketing API v19.0 + dummy data (4 campaigns)
- [x] Create /api/integrations/meta/connect + callback + disconnect + ad-account
- [x] Create /api/analytics/meta — 6hr cache, no token refresh needed (long-lived)
- [x] Update /api/integrations/status — add metaAdAccountId
- [x] Components: MetaOverviewCards, MetaSpendChart, MetaCampaignsTable
- [x] Page: /meta-ads — full dashboard
- [x] Updated connect page — Meta OAuth flow, ad account ID prompt
- [x] Updated sidebar — connection count /3 (Google full + Meta + WP)
- [x] Build: TypeScript clean, next build passing (32 pages)

## Phase 6 Tasks (Unified View + AI — COMPLETE this session)
- [x] Install @anthropic-ai/sdk
- [x] Create /api/analytics/unified — parallel fetch from all sources, merged daily spend
- [x] Create /api/analytics/ai-summary — Claude Haiku summary via POST
- [x] Component: UnifiedStats — Total Spend, Paid Impressions, Organic Clicks, Sessions
- [x] Component: SpendBreakdownChart — Google vs Meta daily spend (dual AreaChart)
- [x] Component: AiSummaryWidget — on-demand AI summary with loading skeletons
- [x] Component: IntegrationQuickLinks — 5-column grid linking to each dashboard section
- [x] Rewrote /app/(dashboard)/page.tsx — unified dashboard (onboarding if nothing connected)
- [x] Updated .env.example — ANTHROPIC_API_KEY
- [x] Build: TypeScript clean, next build passing (34 pages)

## Phase 7 Tasks (Agency Features — COMPLETE this session)
- [x] Schema: add MemberRole enum, WorkspaceMember, WorkspaceInvite models (migration: phase7_team_members)
- [x] Regenerated Prisma client
- [x] Updated auth.config.ts — allow /invite/ routes without authentication
- [x] Created lib/workspace.ts — getMembership (lazy OWNER creation), canManageMembers, canEdit, ROLE_LABELS
- [x] API: GET/PATCH /api/workspace — workspace info + rename
- [x] API: GET /api/workspace/members — members list + pending invites + currentUserRole
- [x] API: PATCH/DELETE /api/workspace/members/[id] — role change (OWNER only) + remove member
- [x] API: POST /api/workspace/invite — create 7-day invite with 32-byte token
- [x] API: GET/POST /api/invite/[token] — validate + accept invite (public route)
- [x] Page: /invite/[token] — public invite acceptance UI
- [x] Page: /settings — real settings (workspace rename, member count, link to members)
- [x] Page: /settings/members — full team management (invite, list, role change, remove)
- [x] UI: Select component (Base UI select wrapper)
- [x] UI: AlertDialog component (Base UI alert-dialog wrapper)
- [x] Updated sidebar — added Members nav link
- [x] Build: TypeScript clean, next build passing

## Phase 8 Tasks (TikTok Ads + LinkedIn Ads — IN PROGRESS)
- [x] services/tiktok/auth.ts — OAuth URL, token exchange, token refresh
- [x] services/tiktok/ads.ts — Marketing API v1.3 + dummy data (4 campaigns)
- [x] services/linkedin/auth.ts — OAuth URL, token exchange
- [x] services/linkedin/ads.ts — Ad Analytics API + dummy data (4 campaigns)
- [x] API: GET /api/integrations/tiktok/connect — returns OAuth URL + CSRF state cookie
- [x] API: GET /api/integrations/tiktok/callback — exchange code, upsert ConnectedAccount
- [x] API: POST /api/integrations/tiktok/disconnect
- [x] API: POST /api/integrations/tiktok/ad-account — save advertiser ID to propertyId
- [x] API: GET /api/integrations/linkedin/connect — returns OAuth URL + CSRF state cookie
- [x] API: GET /api/integrations/linkedin/callback — exchange code, upsert ConnectedAccount
- [x] API: POST /api/integrations/linkedin/disconnect
- [x] API: POST /api/integrations/linkedin/ad-account — save account ID to propertyId
- [x] API: GET /api/analytics/tiktok — 6hr cache + token refresh
- [x] API: GET /api/analytics/linkedin — 6hr cache
- [ ] Components: TikTokOverviewCards, TikTokSpendChart, TikTokCampaignsTable
- [ ] Components: LinkedInOverviewCards, LinkedInSpendChart, LinkedInCampaignsTable
- [ ] Page: /tiktok-ads — full dashboard
- [ ] Page: /linkedin-ads — full dashboard
- [x] Update sidebar — add TikTok Ads + LinkedIn Ads nav links
- [x] Update connect page — TikTok + LinkedIn OAuth flows, advertiser ID prompts
- [x] Update /api/integrations/status — add tiktok, linkedin fields
- [x] Update .env.example — TikTok + LinkedIn vars
- [x] Updated README.md — full project documentation
- [x] Build: TypeScript clean, next build passing

## Phase 9 Tasks (Client Reports — COMPLETE this session)
Agency-style marketing reports based on research (AgencyAnalytics, DashThis patterns):
- [x] Schema: GeneratedReport model + ReportStatus enum (migration: phase9_reports)
- [x] Service: services/reports/generate.ts — fetches all channels, builds report payload, AI narrative
- [x] API: GET/POST /api/reports — list + generate
- [x] API: GET/DELETE /api/reports/[id]
- [x] Component: ReportExecutiveSummary — 6 KPI cards + AI narrative section
- [x] Component: ReportChannelTable — all channels side-by-side with totals row + spend %
- [x] Component: ReportSpendBreakdown — multi-channel AreaChart (Google+Meta+TikTok+LinkedIn)
- [x] Component: ReportMoMComparison — 4 period-over-period cards with delta % + trend icons
- [x] Page: /reports — list view with delete + status badges
- [x] Page: /reports/new — title input + date range presets + generate button
- [x] Page: /reports/[id] — full report view with all sections
- [x] Updated sidebar — Reports link with FileText icon
- [x] Build: TypeScript clean, next build passing

## Key Report Sections (agency-style)
1. Executive Summary (6 KPI cards: spend, impressions, clicks, conversions, CTR, CPA)
2. AI Executive Narrative (3-4 sentences + bullets via Claude Haiku)
3. Period-over-Period Comparison (MoM % delta with trend arrows)
4. Daily Ad Spend by Channel (multi-channel AreaChart)
5. Channel Performance Breakdown Table (all channels, standard metrics, totals row)

## Next 3 Tasks
1. Continue fixing OAuth state cookie issue (Google connect still pending test)
2. Phase 10: PDF export + client branding (logo, custom colors)
3. Deploy to Vercel / Supabase

## Session: 2026-04-29 — OAuth hardening + UX improvements
- Fixed logout requiring two clicks (signOut redirect:false + router.refresh)
- Fixed 401 on all API routes on Windows (localhost → 127.0.0.1, trustHost: true)
- Fixed OAuth state cookie never being set (Response → NextResponse.cookies.set)
- Redesigned connect page to intent-first flow (each Google service has its own Connect button)
- Added GA4 property and GSC site auto-listing via Admin API and Webmasters API
- Added Google Ads customer ID as separate metadata field (no longer conflicts with GA4 propertyId)
- Fixed WordPress page showing "Failed" — added proper error handling in analytics route
- Fixed WordPress data showing all zeros — removed date filter from overview counts
- Fixed WordPress accepting /wp-admin URL — normalizes to site root before storing
- Upgraded DateRangePicker from 3 presets to 9 presets + custom date range inputs

## Blockers / Pending Decisions
- Google OAuth state cookie issue still unconfirmed — needs user test after fixes
- Need real API credentials to test live data (Google, Meta, WordPress)
- ANTHROPIC_API_KEY needed for AI summaries to work

## Notes
- ENCRYPTION_KEY has been added to .env (generated this session)
- DATABASE_URL changed from localhost → 127.0.0.1 (Docker Windows fix)
- docker compose command requires full path: C:\Program Files\Docker\Docker\resources\bin\docker.exe
- Prisma migrate requires PowerShell (bash has IPv6 localhost issue)

---

## Phase Reference

### Phase 1 — Foundation + Basic UI Shell ✅
Auth, workspace creation, multi-tenancy, Redis + BullMQ setup.
Dashboard layout shell with sidebar, navbar, empty states visible.

### Phase 2 — GA4 Integration + GA4 Dashboard UI (In Progress)
Google OAuth connect button + backend token storage + sync job.
GA4 dashboard section: sessions, users, bounce rate, traffic sources.
Date range picker. Real GA4 data visible on screen after this phase.
Currently: dummy data mode. Swap to real data when credentials available.

### Phase 3 — Google Ads Integration + Ads Dashboard UI
Add Google Ads scope to existing Google OAuth (same connect flow).
Ads dashboard section: spend, clicks, impressions, CPC, ROAS.

### Phase 4 — Search Console + WordPress + UI
Search Console section: keywords, clicks, impressions, CTR, position.
WordPress section: posts, traffic, top pages.

### Phase 5 — Meta Integration + Meta Dashboard UI
Meta OAuth connect button + token storage + sync jobs.
Meta dashboard section: spend, reach, CPM, CTR, conversions.

### Phase 6 — Unified View + AI Layer
Cross-platform unified metrics (total spend across Google + Meta).
Date range synced across all sections. AI summaries. Anomaly alerts.
This is the launchable MVP.

### Phase 7 — Agency Features
Multi-project management, team members + roles.
White-label client portal, scheduled PDF reports.

### Phase 8 — Additional Integrations
TikTok Ads, LinkedIn Ads, Google Business Profile, others based on demand.
