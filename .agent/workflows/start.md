---
description: 
---

# /start — Session Start

## Environment First
1. Run: docker compose up -d
2. Wait for Postgres and Redis to confirm running
3. If first time or schema changed, run: npx prisma migrate dev

## Then Load Context
1. Read GEMINI.md
2. Read AGENTS.md
3. Read SESSION.md

## Then Tell Me
- Current phase
- Last completed task
- What we are building today
- Any blockers

## Confirm Security Mode
Before writing any code confirm:
- Session check on every API route ✅
- workspace_id from session only ✅
- Tokens encrypted before DB ✅
- Zod validation on all input ✅

## Then Start
State the first task and begin.