# Onelytics — Antigravity Rules

## Project Overview
Unified marketing analytics dashboard. Solo-first, agency-ready.
Connects GA4, Google Ads, Search Console, WordPress in Phase 2.
Meta Ads (Facebook + Instagram) and others in Phase 3.

## Rules Priority
Read these files at the start of every session:
1. GEMINI.md (this file) — Antigravity-specific rules
2. AGENTS.md — shared project rules (tech stack, security, folder structure)
3. SESSION.md — current session state and active task

## Antigravity-Specific Behavior
- Use **Review-driven development** autonomy profile
- Always ask before deleting any file
- Always ask before running database migrations
- Never deploy to production without explicit instruction
- When unsure between two approaches, present both and ask
- Keep responses concise — skip obvious explanations
- If you see a potential security issue, stop and flag it before continuing

## Model Assignment
- Use Gemini 3.1 Pro for: feature implementation, architecture decisions, complex refactoring
- Use Claude Sonnet 4.6 for: security review, OAuth logic, encryption, complex debugging
- Use Gemini 3 Flash for: boilerplate, scaffolding, documentation, formatting, comments

Each model runs on a separate quota pool — using all three preserves each pool
and avoids hitting any single limit. Never use Gemini Pro for tasks Flash can handle.
Never use Claude Sonnet for tasks Gemini Pro can handle.

## UI Direction
Reference: AgencyAnalytics layout structure — mimicked for Phase 1, redesigned later.

### Layout
- Left sidebar: logo, nav sections, connected integrations status at bottom
- Top bar: page title, date range picker, user avatar
- Main content: metric cards row → charts row → integration strips
- Sidebar width: 220px fixed, main content fills remaining width

### Theme
- Support both light and dark mode from day one using CSS variables and Tailwind dark:
- Light: white sidebar + white cards + gray page background
- Dark: dark sidebar + dark cards + darker page background
- Never hardcode colors — always use Tailwind dark: variants or CSS variables
- Every component must look correct in both modes before committing

### Colors
- Primary accent: blue-600 (#2563eb) — used for active nav, buttons, links, chart lines
- Success: green-600 — for positive metric changes and live badges
- Danger: red-600 — for negative metric changes
- Warning: yellow-600 — for disconnected/pending states
- Borders: gray-200 light / gray-700 dark — always 1px, never thicker
- Cards: white light / gray-800 dark background

### Typography
- Font: Geist (Next.js default) — do not change
- Nav labels: 10px uppercase tracking-wide text-gray-400
- Metric values: 22px font-medium
- Card titles: 13px font-medium
- Body / labels: 12–13px text-gray-500

### Components (shadcn/ui only)
- Use shadcn/ui for all UI components — no custom CSS unless absolutely necessary
- Charts: Recharts library
- Icons: Lucide React (already included with shadcn)
- Metric cards: bg-white dark:bg-gray-800, border, rounded-lg, p-4
- Badges: small pill — green for live, yellow for warning, gray for inactive
- Nav items: rounded-md, active state bg-blue-50 dark:bg-blue-950 text-blue-600

### Rules
- Mobile responsive is NOT a priority for Phase 1 — desktop first
- Every new component must have a dark mode variant before being committed
- Empty states must always be implemented — never leave a blank white box
- Loading states must always be implemented — use shadcn Skeleton component

## Session Start Protocol
At the start of every session:
1. Read AGENTS.md
2. Read SESSION.md
3. Confirm current phase and active task
4. State what you will build in this session before writing any code

## Commit Convention
feat: add Google OAuth connection flow
fix: workspace_id missing from analytics query
security: encrypt tokens before DB storage
refactor: move GA4 logic to services/google/ga4.ts
chore: update .env.example with ENCRYPTION_KEY
docs: update SESSION.md with completed tasks
ui: add date range picker to dashboard header
