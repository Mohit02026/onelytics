# Onelytics

Unified marketing analytics dashboard for agencies. Connect Google Analytics, Google Ads, Search Console, Meta Ads, TikTok Ads, LinkedIn Ads, and Google Business Profile into per-client workspaces with team management, AI-powered reports, and a white-label client portal.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma
- **Auth**: NextAuth v5 — credentials-based, JWT strategy, custom fields read from DB in JWT callback
- **Encryption**: AES-256-GCM for stored OAuth tokens
- **AI**: Anthropic Claude Haiku (report narratives, dashboard summaries)
- **UI**: Tailwind CSS, Radix UI, Recharts
- **Testing**: Vitest (unit/integration/component), Playwright (E2E)

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (optional — only needed for Upstash rate limiting in production)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Minimum required variables:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random 32-byte hex string |
| `AUTH_URL` | `http://localhost:3000` in dev |
| `ENCRYPTION_KEY` | Random 32-byte hex string (for token encryption) |
| `DATABASE_URL` | PostgreSQL connection string |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database setup

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Run

```bash
npm run dev        # development
npm run build && npm start   # production
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Lint with ESLint |
| `npx vitest` | Run unit + integration + component tests |
| `npx playwright test` | Run E2E tests |
| `npx prisma studio` | Open Prisma DB browser |
| `npx prisma migrate dev` | Apply migrations in dev |
| `npx prisma generate` | Regenerate Prisma client |

---

## Integrations

Each integration uses OAuth (except WordPress). All run in **demo mode** with seeded dummy data if the real token is the sentinel value `DEMO_TOKEN`.

| Integration | OAuth App Setup | Key Variables |
|---|---|---|
| **Google** (GA4 + Ads + Search Console + GBP) | [Google Cloud Console](https://console.cloud.google.com) → Credentials | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN` |
| **Meta Ads** | [Meta Developers](https://developers.facebook.com) | `META_APP_ID`, `META_APP_SECRET` |
| **TikTok Ads** | [TikTok Business API](https://business-api.tiktok.com) | `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET` |
| **LinkedIn Ads** | [LinkedIn Developer Portal](https://developer.linkedin.com) | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| **WordPress** | Application Password in WP Admin → Users | Stored encrypted per workspace |

### Required OAuth Redirect URIs

```
http://localhost:3000/api/integrations/google/callback
http://localhost:3000/api/integrations/meta/callback
http://localhost:3000/api/integrations/tiktok/callback
http://localhost:3000/api/integrations/linkedin/callback
```

Replace `http://localhost:3000` with your domain in production.

---

## Project Structure

```
app/
  (auth)/               # Login + register
  (dashboard)/          # Authenticated workspace views
    page.tsx            # Unified overview (all platforms)
    ga4/                # Google Analytics
    google-ads/         # Google Ads
    search-console/     # Search Console + keyword positions
    meta-ads/           # Meta Ads
    tiktok-ads/         # TikTok Ads
    linkedin-ads/       # LinkedIn Ads
    wordpress/          # WordPress stats
    gbp/                # Google Business Profile
    seo/                # SEO overview
    reports/            # AI-generated client reports
    connect/            # Connect integrations
    settings/           # Workspace settings, members, integrations
  (agency)/             # Agency-level views (org owners only)
    agency/             # Multi-workspace overview
    org-settings/       # Organisation settings
  (portal)/             # Public client portal (no auth required)
  (admin-panel)/        # Internal admin panel
  api/
    analytics/          # Per-platform data endpoints
    integrations/       # OAuth connect/callback/disconnect
    workspace/          # Workspace management
    workspaces/         # Multi-workspace listing + creation
    agency/             # Agency overview data
    reports/            # Report generation + listing
    user/               # User profile + onboarding
    invite/             # Invite acceptance
    portal/             # Portal data (public)
    admin/              # Admin API (separate auth)
services/               # API service layer
  google/, meta/, tiktok/, linkedin/, wordpress/
  reports/              # Report generation + AI narrative
lib/                    # Auth, DB, encryption, workspace helpers
components/
  analytics/            # Charts + tables per platform
  ui/                   # Shared UI primitives
  onboarding-wizard.tsx # First-run setup flow
  workspace-switcher.tsx
prisma/
  schema.prisma
  migrations/
tests/
  unit/                 # Pure logic (formatters, encryption, calculations)
  integration/          # API route tests against test DB
  component/            # React component tests
  e2e/                  # Playwright end-to-end flows
```

---

## Multi-Tenant Structure

```
Organisation (Agency)
  └── Workspace (Client A)
  │     └── WorkspaceMembers (Owner / Admin / Member / Viewer)
  │     └── ConnectedAccounts (OAuth tokens)
  │     └── Reports
  └── Workspace (Client B)
        └── ...
```

An **Organisation** maps to an agency. Each **Workspace** is one client. Users belong to an org and can be members of one or more workspaces.

---

## Role-Based Access

| Role | Analytics | Integrations | Members | Reports | Agency view |
|---|---|---|---|---|---|
| **Owner** | ✓ | ✓ | ✓ | Generate + view | ✓ |
| **Admin** | ✓ | ✓ | ✓ | Generate + view | — |
| **Member** | ✓ | ✓ | — | Generate + view | — |
| **Viewer** | ✓ | — | — | View only | — |

Invite members via **Settings → Members → Invite Member**. Links expire after 7 days.

---

## Authentication Architecture

NextAuth v5 with a two-file pattern:

- **`auth.config.ts`** — edge-safe config used by middleware. Contains only the `authorized` guard (no DB imports).
- **`lib/auth.ts`** — server-side config. Contains the `CredentialsProvider`, JWT callback (reads `workspaceId`, `organizationId`, `onboarded`, `orgRole` from DB on every fresh login), and session callback.

Custom JWT fields are always populated via DB query in the JWT callback — not from the `authorize()` return value — to ensure reliability across NextAuth v5 beta releases.

---

## Database Schema

Key models:

| Model | Purpose |
|---|---|
| `User` | Authenticated users |
| `Organization` | Top-level agency container |
| `OrgMember` | User ↔ org membership (OWNER / MEMBER) |
| `Workspace` | Per-client tenant |
| `WorkspaceMember` | User ↔ workspace role (OWNER / ADMIN / MEMBER / VIEWER) |
| `WorkspaceInvite` | Pending email invitations |
| `ConnectedAccount` | Encrypted OAuth tokens per platform per workspace |
| `AnalyticsCache` | 6-hour server-side cache for API responses |
| `Report` | Generated client reports |

---

## Deployment

1. Set all environment variables on your hosting platform
2. Set `AUTH_URL` to your production domain
3. Run `npx prisma migrate deploy` (not `dev`) in production
4. `npm run build && npm start`

Tested on Vercel and Railway.
