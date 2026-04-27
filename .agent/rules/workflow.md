# Workflow Rules — Onelytics

## Core Rule
Backend + UI ship together in every phase.
Never a phase of pure backend. Never UI before the API works.

## Feature Build Order (every feature, every phase)
1. Prisma schema change (if needed)
2. Backend service logic → /services/*
3. BullMQ sync job → /workers/* (if fetching from external API)
4. API route → /app/api/*
5. UI component → /components/*
6. Page → /app/(dashboard)/*

## Per-Feature Definition of Done
- [ ] API route tested and working locally
- [ ] UI renders real data from the API (not mocked)
- [ ] Security checklist in security.md passed
- [ ] .env.example updated if new vars added
- [ ] No TypeScript errors
- [ ] No hardcoded secrets
- [ ] Committed to git with correct commit message

## Phase Gates

### Phase 1 Gate — Before starting Phase 2
- [ ] User can sign up and log in with email/password
- [ ] Workspace auto-created on signup
- [ ] All /api/* routes return 401 without valid session
- [ ] Two different users cannot see each other's data
- [ ] Redis connected and BullMQ worker running
- [ ] docker-compose starts Postgres + Redis cleanly
- [ ] Dashboard layout renders with sidebar + navbar
- [ ] Connect Accounts page visible (even if empty)
- [ ] Settings page visible (even if empty)

### Phase 2 Gate — Before starting Phase 3
- [ ] Google OAuth connect button works end to end
- [ ] Tokens stored encrypted in DB (verify in DB directly)
- [ ] GA4 sync job runs via BullMQ without errors
- [ ] Token refresh works before expiry
- [ ] GA4 dashboard section shows real data
- [ ] Date range picker changes the data shown
- [ ] Disconnecting removes tokens from DB

### Phase 3 Gate — Before starting Phase 4
- [ ] Google Ads scope added to existing Google OAuth
- [ ] Google Ads sync job runs without errors
- [ ] Ads dashboard section shows real spend + performance data
- [ ] GA4 and Ads sections both visible on dashboard together

### Phase 4 Gate — Before starting Phase 5
- [ ] Search Console sync job runs without errors
- [ ] Search Console section shows keywords, clicks, CTR, position
- [ ] WordPress connected and stats section visible
- [ ] All 4 Google integrations visible on dashboard

### Phase 5 Gate — Before starting Phase 6
- [ ] Meta OAuth connect button works end to end
- [ ] Meta tokens encrypted and stored correctly
- [ ] Facebook Ads + Instagram Ads sync jobs run without errors
- [ ] Meta dashboard section shows spend, reach, CPM, CTR
- [ ] Meta token refresh at day 50 scheduled correctly

### Phase 6 Gate — Launchable MVP
- [ ] Unified metrics card shows total spend across Google + Meta
- [ ] Date range picker synced across all dashboard sections
- [ ] AI summary renders per section
- [ ] Anomaly alert fires when metric drops significantly
- [ ] Dashboard loads under 2 seconds from cache
- [ ] Mobile responsive layout works
- [ ] Empty states render cleanly when no data

### Phase 7 Gate — Before starting Phase 8
- [ ] Multiple projects work per workspace
- [ ] Project data is isolated from other projects
- [ ] Team members can be invited with correct roles
- [ ] Client portal login works read-only
- [ ] White-label domain works
- [ ] PDF report generates and emails correctly

## After Each Phase Completes
1. Update AGENTS.md — mark phase complete, update current phase
2. Update SESSION.md — clear tasks, set next phase tasks
3. Tag in git: `git tag phase-1-complete`
4. Push to GitHub

## Commit Convention
feat: add GA4 OAuth connection flow and dashboard section
feat: add Google Ads sync job and spend metrics UI
fix: workspace_id missing from analytics cache query
security: encrypt Meta tokens before DB storage
refactor: move GA4 logic to services/google/ga4.ts
chore: update .env.example with GOOGLE_ADS_DEVELOPER_TOKEN
ui: add date range picker to dashboard header
