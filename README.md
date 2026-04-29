# Onelytics

Unified marketing analytics dashboard. Connect Google Analytics, Google Ads, Search Console, Meta Ads, TikTok Ads, LinkedIn Ads, and WordPress into a single workspace with team management and AI-powered summaries.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma 7
- **Auth**: NextAuth v5 (credentials + session)
- **Encryption**: AES-256-GCM for stored tokens
- **AI**: Anthropic Claude Haiku
- **UI**: Tailwind CSS, Base UI, Recharts

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database (local or Supabase)
- Redis (local or Upstash)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` — at minimum you need:

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | `http://localhost:3000` in dev |
| `NEXTAUTH_SECRET` | Random 32-byte hex string |
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

### 5. Run the dev server

```bash
npm run dev
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
| `npx prisma studio` | Open Prisma DB browser |
| `npx prisma migrate dev` | Apply migrations in dev |
| `npx prisma generate` | Regenerate Prisma client |
| `npx tsc --noEmit` | TypeScript type-check |

---

## Integrations

Each integration requires OAuth credentials (except WordPress). All run in **demo mode** with seeded dummy data if the real token is the sentinel value.

| Integration | OAuth App Setup | Key Variables |
|---|---|---|
| **Google** (GA4 + Ads + Search Console) | [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **Meta Ads** | [Meta Developers](https://developers.facebook.com) → My Apps | `META_APP_ID`, `META_APP_SECRET` |
| **TikTok Ads** | [TikTok Business API](https://business-api.tiktok.com) → My Apps | `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET` |
| **LinkedIn Ads** | [LinkedIn Developer Portal](https://developer.linkedin.com) | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| **WordPress** | Application Password in WP Admin → Users | None (credentials stored encrypted) |

### Required OAuth Redirect URIs

Register these in each OAuth app:

```
http://localhost:3000/api/integrations/google/callback
http://localhost:3000/api/integrations/meta/callback
http://localhost:3000/api/integrations/tiktok/callback
http://localhost:3000/api/integrations/linkedin/callback
```

For production replace `http://localhost:3000` with your domain.

---

## Project Structure

```
app/
  (dashboard)/          # Authenticated dashboard pages
    page.tsx            # Unified overview
    ga4/                # Google Analytics
    google-ads/         # Google Ads
    search-console/     # Search Console
    meta-ads/           # Meta Ads
    tiktok-ads/         # TikTok Ads
    linkedin-ads/       # LinkedIn Ads
    wordpress/          # WordPress
    connect/            # Connect integrations
    settings/           # Workspace settings
      members/          # Team management
  api/
    analytics/          # Per-platform analytics endpoints
    integrations/       # OAuth connect/callback/disconnect
    workspace/          # Workspace + members API
  invite/[token]/       # Public invite acceptance
services/               # API service layer (real + dummy data)
  google/, meta/, tiktok/, linkedin/, wordpress/
lib/                    # Auth, DB, encryption, workspace helpers
components/
  analytics/            # Chart and table components per platform
  ui/                   # Shared UI primitives
prisma/
  schema.prisma         # Database schema
  migrations/           # Migration history
```

---

## Team Features

Onelytics supports multi-user workspaces with role-based access:

| Role | Can view | Can edit integrations | Can manage members | Can rename workspace |
|---|---|---|---|---|
| **Owner** | Yes | Yes | Yes | Yes |
| **Admin** | Yes | Yes | Yes | Yes |
| **Member** | Yes | Yes | No | No |
| **Viewer** | Yes | No | No | No |

Invite members via **Settings → Members → Invite Member**. Invite links expire after 7 days.

---

## Environment Variables Reference

See [`.env.example`](.env.example) for all variables with setup instructions.

---

## Database Schema

Key models:

- `User` — authenticated users
- `Workspace` — tenant container
- `WorkspaceMember` — user ↔ workspace membership with role
- `WorkspaceInvite` — pending invitations
- `ConnectedAccount` — OAuth tokens per platform (encrypted)
- `AnalyticsCache` — 6-hour cache for API responses

---

## Deployment

1. Set all environment variables in your hosting platform
2. Set `NEXTAUTH_URL` to your production domain
3. Run `npx prisma migrate deploy` (not `dev`) in production
4. Build: `npm run build`
5. Start: `npm start`

Tested on Vercel and Railway.
