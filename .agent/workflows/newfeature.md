# /newfeature — New Feature Checklist

Run before starting any new feature.

## Define It First
- What does this feature do in one sentence?
- Which phase does it belong to?
- Which files will be created?
- Which files will be modified?

## Check Against Rules
- New API route? → Follow auth pattern in AGENTS.md
- Touches DB? → Confirm workspace_id is included
- Handles OAuth tokens? → Confirm encryption used
- Calls Google/Meta API? → Confirm goes through BullMQ
- New env vars? → Update .env.example now

## Build Order
1. Prisma schema change (if needed)
2. /services/* logic
3. /app/api/* route
4. /components/* UI

Never build UI before the API is working and tested.

## Test Before Done
- Happy path works
- No session → 401
- Wrong workspace → 403 or empty result
- Invalid input → 400

## Finish
Run /audit before committing.
