# Security Rules — Onelytics
## Non-negotiable. Every rule applies to every line of code.

## S-1: OAuth Token Storage
✅ Encrypt with AES-256-GCM before storing in PostgreSQL
✅ Use ENCRYPTION_KEY env var (32 random bytes)
✅ Always use /lib/encryption.ts — never write custom crypto inline
✅ Columns: encrypted_access_token, encrypted_refresh_token
❌ Never return raw tokens in API responses
❌ Never store tokens in localStorage, sessionStorage, or cookies
❌ Never console.log tokens anywhere

## S-2: Authentication & Sessions
✅ Use NextAuth.js — never build custom auth from scratch
✅ Every API route: session check is line 1
✅ workspace_id always from session — never from URL or body
✅ httpOnly + secure + sameSite cookies for sessions
❌ Never trust workspace_id or client_id from the frontend
❌ Never use raw integer DB IDs in URLs — use UUID or slug

## S-3: Secrets & Environment Variables
✅ All secrets in .env (local) and platform env vars (prod)
✅ .env always in .gitignore
✅ .env.example committed with placeholder values only
✅ Required keys:
   NEXTAUTH_SECRET, NEXTAUTH_URL, ENCRYPTION_KEY
   DATABASE_URL, REDIS_URL
   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
   GOOGLE_ADS_DEVELOPER_TOKEN
   META_APP_ID, META_APP_SECRET
❌ Never hardcode any secret in source code
❌ Never commit .env file

## S-4: API Route Protection
✅ Rate limit every route via @upstash/ratelimit
✅ Validate all input with Zod before using it
✅ Always filter DB queries by workspace_id from session
✅ Return 401 (no session), 403 (wrong workspace), 400 (bad input)
❌ Never have a public route that returns user or client data
❌ Never use req.body or req.query directly — always parse with Zod first

## S-5: Input Validation
✅ Zod schemas for ALL incoming data
✅ Validate on backend — frontend validation is UX only
✅ Prisma parameterized queries always
❌ Never concatenate user input into DB queries
❌ Never use dangerouslySetInnerHTML with user content

## S-6: Google & Meta API Safety
✅ Check token expiry before every API call
✅ Refresh proactively 30 min before expiry
✅ Exponential backoff on failures: 1s → 2s → 4s → 8s
✅ All calls through BullMQ — never synchronous on page load
✅ Max 5 concurrent external API calls per provider
❌ Never call Google/Meta from a React component
❌ Never fan out unlimited concurrent API calls

## Security Checklist (run before every commit)
- [ ] Every API route checks session first
- [ ] workspace_id comes from session not request
- [ ] All DB queries include workspace_id filter
- [ ] Tokens encrypted before hitting DB
- [ ] No tokens in API responses
- [ ] All input validated with Zod
- [ ] No hardcoded secrets
- [ ] .env.example updated with any new keys
- [ ] No TypeScript errors
