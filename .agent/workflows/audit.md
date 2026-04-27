# /audit — Security Audit

Run after completing any feature, before committing.

## Auth & Sessions
- [ ] API route checks session as first line
- [ ] Returns 401 if no session
- [ ] workspace_id from session — not URL params

## Database
- [ ] All queries include workspace_id filter
- [ ] No raw SQL
- [ ] Required indexes exist

## Tokens & Secrets
- [ ] Tokens encrypted before DB storage
- [ ] No tokens in API responses
- [ ] No tokens in localStorage or state
- [ ] No hardcoded secrets
- [ ] .env.example updated

## Input Validation
- [ ] All request data validated with Zod
- [ ] No dangerouslySetInnerHTML with user content

## API Safety
- [ ] No Google/Meta calls from frontend
- [ ] All external calls through BullMQ or backend services
- [ ] Rate limiting on new routes

## TypeScript
- [ ] No `any` types
- [ ] No TypeScript errors

## Result
Tell me: what passed, what failed, safe to commit or not.
