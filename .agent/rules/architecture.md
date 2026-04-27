# Architecture Rules — Onelytics

## Core Principle
Frontend → Your Backend → Google/Meta APIs
Never: Frontend → Google/Meta directly

## Request Flow
1. User opens dashboard in browser
2. Frontend calls YOUR backend /api/* route
3. Backend checks Redis cache — if fresh (< 6hrs) return cached data
4. If stale — backend fetches from Google/Meta using stored encrypted token
5. Data saved to Redis + PostgreSQL, returned to frontend
6. Frontend renders — never sees raw tokens

## Integration Architecture
All integrations follow the same pattern:

```
OAuth Connect Flow:
User clicks connect → OAuth popup → Token returned
→ Encrypt token → Store in DB → Create BullMQ sync job
→ Job runs on schedule → Stores data in cache
→ Frontend reads from cache via API route

Sync Job Flow:
BullMQ triggers job → Decrypt token from DB
→ Check expiry → Refresh if needed
→ Call Google/Meta API → Store result in Redis + DB
→ Mark job complete
```

## Google Integration (Phase 2)
Single OAuth2 flow covers all Google services:
- GA4: https://www.googleapis.com/auth/analytics.readonly
- Google Ads: https://www.googleapis.com/auth/adwords
- Search Console: https://www.googleapis.com/auth/webmasters.readonly
- WordPress: via WordPress.com OAuth or self-hosted REST API

Sync schedule:
- GA4: every 6 hours
- Google Ads: every 6 hours
- Search Console: every 12 hours
- WordPress: every 24 hours

## Meta Integration (Phase 3)
Single OAuth2 flow covers Facebook + Instagram:
- Facebook Ads: ads_read, ads_management
- Instagram Ads: instagram_basic, instagram_manage_insights
- Business: business_management, pages_read_engagement

Sync schedule:
- Meta Ads: every 6 hours
- Token refresh: at day 50 (60 day expiry)

## Background Jobs (BullMQ)
Job types:
- sync:ga4 — fetch GA4 data per connected account
- sync:google-ads — fetch campaign data
- sync:gsc — fetch Search Console data
- sync:wordpress — fetch WordPress stats
- sync:meta — fetch Facebook + Instagram Ads data
- token:refresh — refresh expiring OAuth tokens
- report:generate — render + email PDF report (Phase 5)

## Caching Strategy
- Redis: hot cache, data < 6 hours old
- PostgreSQL analytics_cache: persistent cache, used for date range queries
- Cache key format: {workspace_id}:{client_id}:{provider}:{data_type}:{date}

## Rate Limiting
- User API routes: 60 requests/minute per user (via @upstash/ratelimit)
- Auth routes: 10 requests/minute per IP
- BullMQ: max 5 concurrent external API calls per provider

## Database Indexes Required
```prisma
model analytics_cache {
  @@index([workspace_id])
  @@index([workspace_id, client_id])
  @@index([workspace_id, client_id, provider])
  @@index([fetched_at])
}

model connected_accounts {
  @@index([workspace_id])
  @@index([workspace_id, client_id])
  @@index([expires_at])
}
```
