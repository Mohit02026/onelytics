# Session Context

## Update This Every Session
> Before starting work, update this file with today's goal.
> Tell the agent: "Read GEMINI.md, AGENTS.md and SESSION.md before we start"

---

## Current Session Goal
_Phase 1 finalized. Ready to begin Phase 2 (Google Auth)._

---

## Current Phase
**Phase 2 — GA4 Integration + GA4 Dashboard UI**

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

## Last Completed
- Scaffolded Next.js 14 project with TypeScript + Tailwind + shadcn/ui
- Set up docker-compose for Postgres + Redis
- Initialized Prisma schema with `workspace_id` filtering paradigm
- Configured NextAuth (v5 beta) with credentials provider & session callback
- Created user registration API route with atomic workspace auto-creation
- Setup edge-compatible middleware for dashboard route protection
- Started Docker containers for local DB & Redis
- Created Redis client and BullMQ worker placeholders
- Added rate-limiting wrapper to `middleware.ts`
- Built Dashboard UI Shell (Sidebar, Navbar, Empty State Layout)
- Created Connect Accounts page skeleton (`/connect`)
- Created Settings page skeleton (`/settings`)

## Next 3 Tasks
1. Connect Accounts page skeleton & Settings page skeleton
2. Phase 2: Google OAuth Connect button + token storage
3. Phase 2: GA4 Sync Job & API route

## Blockers / Pending Decisions
_None_

## Notes
_Add anything important from last session here_

---

## Phase Reference

### Phase 1 — Foundation + Basic UI Shell
Auth, workspace creation, multi-tenancy, Redis + BullMQ setup.
Dashboard layout shell with sidebar, navbar, empty states visible.
You can navigate the app from day one — nothing hidden behind loading states.

### Phase 2 — GA4 Integration + GA4 Dashboard UI
Google OAuth connect button + backend token storage + sync job.
GA4 dashboard section: sessions, users, bounce rate, traffic sources.
Date range picker. Real GA4 data visible on screen after this phase.

### Phase 3 — Google Ads Integration + Ads Dashboard UI
Add Google Ads scope to existing Google OAuth (same connect flow).
Ads dashboard section: spend, clicks, impressions, CPC, ROAS.
GA4 + Ads both visible and working after this phase.

### Phase 4 — Search Console + WordPress + UI
Search Console section: keywords, clicks, impressions, CTR, position.
WordPress section: posts, traffic, top pages.
All Google integrations complete and visible after this phase.

### Phase 5 — Meta Integration + Meta Dashboard UI
Meta OAuth connect button + token storage + sync jobs.
Meta dashboard section: spend, reach, CPM, CTR, conversions.
Facebook Ads + Instagram Ads both visible after this phase.

### Phase 6 — Unified View + AI Layer
Cross-platform unified metrics (total spend across Google + Meta).
Date range synced across all sections.
AI summaries per section. Anomaly alerts.
This is the launchable MVP.

### Phase 7 — Agency Features
Multi-project management, team members + roles.
White-label client portal, scheduled PDF reports.

### Phase 8 — Additional Integrations
TikTok Ads, LinkedIn Ads, Google Business Profile, others based on demand.
