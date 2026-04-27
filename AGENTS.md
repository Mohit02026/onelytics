# Onelytics — Project Rules

## What This Project Is
Unified marketing analytics dashboard for solo users and agencies.
Pulls data from Google (GA4, Ads, Search Console, WordPress) and
Meta (Facebook Ads, Instagram Ads) into a single dashboard.
Built solo-first — agency features added in later phases.

## Core Build Philosophy
**Backend + UI ship together. Every phase produces something visible.**
Never build a phase of pure backend with nothing to see.
Every integration is: OAuth connect → sync job → API route → UI section.
All in the same phase, committed together.

## Current Build Phase
**Phase 1 — Foundation + Basic UI Shell**
See SESSION.md for active task.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js v5 |
| Database | PostgreSQL + Prisma ORM |
| Cache + Queue | Redis + BullMQ |
| Encryption | Node.js crypto — AES-256-GCM |
| Local Dev | Docker (Postgres + Redis via docker-compose) |
| Hosting | Vercel (frontend) + Railway (workers) + Supabase (DB) |

## Phase Overview
- Phase 1: Foundation + UI shell — auth, workspace, layout, empty states
- Phase 2: GA4 + GA4 dashboard — connect, sync, charts, date picker
- Phase 3: Google Ads + Ads dashboard — spend, clicks, CPC, ROAS
- Phase 4: Search Console + WordPress + their dashboard sections
- Phase 5: Meta (Facebook + Instagram) + Meta dashboard section
- Phase 6: Unified view + AI summaries + anomaly alerts → launchable MVP
- Phase 7: Agency features — multi-project, team, white-label, reports
- Phase 8: Additional integrations — TikTok, LinkedIn, GBP, others

## Feature Build Order (within every phase)
1. Prisma schema change (if needed)
2. Backend service logic in /services/*
3. BullMQ sync job in /workers/*
4. API route in /app/api/*
5. UI component in /components/*
6. Page that uses the component in /app/(dashboard)/*
Never build the UI before the API is working and tested.

## Folder Structure
```
/app
  /api/*           → API routes only — no UI logic
  /(dashboard)/*   → Protected dashboard pages
  /(auth)/*        → Login, signup, OAuth callbacks
  /(client)/*      → White-label client portal (Phase 7)
/components/*      → UI components only — no DB or API calls here
/lib
  db.ts            → Prisma client singleton
  redis.ts         → Redis client singleton
  encryption.ts    → AES-256-GCM encrypt/decrypt utility
  auth.ts          → NextAuth config + session helpers
/services
  /google/*        → GA4, Ads, Search Console, WordPress logic
  /meta/*          → Facebook Ads, Instagram Ads logic
/workers/*         → BullMQ job definitions and processors
/prisma
  schema.prisma    → DB schema — single source of truth
/middleware.ts     → Auth protection on all protected routes
.env.example       → All required env vars documented
```

## Database Rules
- Every data table MUST have `workspace_id` column
- Every Prisma query MUST filter by `workspace_id` from session
- Add `@@index([workspace_id])` to every table with workspace_id
- Never expose raw DB integer IDs in URLs — use UUID or slug

## API Route Pattern
Every API route must follow this exact structure:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

export async function GET(req: Request) {
  // 1. Auth check — always first
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Validate input with Zod
  const schema = z.object({ ... })
  const parsed = schema.safeParse(...)
  if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 })

  // 3. Always scope to workspace from session
  const data = await prisma.something.findMany({
    where: { workspace_id: session.user.workspaceId }
  })

  return Response.json(data)
}
```

## Security Rules (Non-Negotiable)
- Tokens encrypted with AES-256-GCM before storing in DB — always use /lib/encryption.ts
- workspace_id always derived from session — never from request params
- All secrets in .env — never hardcoded, never committed
- All input validated with Zod — no raw req.body usage
- Google/Meta APIs never called from frontend — always through backend
- All external API calls go through BullMQ job queue
- Rate limiting on all API routes via @upstash/ratelimit

## Code Quality Rules
- TypeScript only — no .js files
- No `any` types — fix the type properly
- Functions under 30 lines — split if larger
- Files under 300 lines — split if larger
- No console.log in production code — use a structured logger
- Zod validation on ALL incoming request data
- Prisma for ALL database queries — no raw SQL

## Naming Conventions
- Files: kebab-case → `connected-accounts.ts`
- Components: PascalCase → `DashboardCard.tsx`
- Functions: camelCase → `fetchGa4Data`
- DB tables: snake_case → `connected_accounts`
- Env vars: SCREAMING_SNAKE_CASE → `ENCRYPTION_KEY`

## Red Flags — Stop and Fix Immediately
- workspace_id taken from URL params without session verification
- Token or secret returned in API response
- DB query without workspace_id filter
- localStorage used for anything
- Google/Meta API called from a React component
- Missing Zod validation on request data
- Hardcoded secret in any file
- .env committed to git
- UI built before the backing API route is tested
