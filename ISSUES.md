# Issues Log

---

## Session: 2026-04-28 — Phase 2 (Dummy Data)

### Issue 1: DATABASE_URL localhost not resolving on Windows + Docker
**Problem:** `npx prisma migrate dev` failed with `P1001: Can't reach database server at localhost:5432` even though Docker containers were running and port 5432 was open.

**Tried:**
- Verified containers were running (`docker ps` showed both postgres + redis up)
- Ran migration from bash — failed
- Ran migration from PowerShell — failed

**Fix:**
Changed `DATABASE_URL` in `.env` from `localhost` to `127.0.0.1`. Windows resolves `localhost` to `::1` (IPv6) in some shell contexts, but the Docker socket only binds to `127.0.0.1` (IPv4). Migration succeeded immediately after this change.

---

### Issue 2: docker command not found in bash
**Problem:** `docker compose up -d` returned `command not found` in bash tool.

**Tried:**
- `docker --version` in bash — not found
- `where docker` — not found

**Fix:**
Docker Desktop on Windows is installed at `C:\Program Files\Docker\Docker\resources\bin\docker.exe` but not added to bash PATH. Use PowerShell with full path:
```
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose -f D:\Onelytics\docker-compose.yml up -d
```

---

### Issue 3: Prisma 7 — PrismaClient constructor fails with no-args
**Problem:** `new PrismaClient()` threw `PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`.

**Tried:**
- Added `import 'dotenv/config'` to `lib/db.ts` — same error
- Set `$env:DATABASE_URL` explicitly before build — same error
- Passed `{ errorFormat: 'colorless' }` — different error: "Using engine type 'client' requires adapter or accelerateUrl"
- Set `engineType = "library"` in schema generator — still failed (native binary not installed)

**Root Cause:**
Prisma 7 dropped native engine binaries entirely. The new default engine type is `"client"` which requires either a driver adapter (`@prisma/adapter-pg`, etc.) or Prisma Accelerate. `new PrismaClient()` without an adapter is no longer valid in Prisma 7.

**Fix:**
Installed `@prisma/adapter-pg` + `pg` + `@types/pg`. Updated `lib/db.ts`:
```typescript
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })
```
Build passed cleanly after this.

---

### Issue 4: `asChild` prop not recognized on Base UI components
**Problem:** TypeScript errors on `<Button asChild>`, `<DropdownMenuTrigger asChild>`, `<DropdownMenuItem asChild>` — all from shadcn/ui components built on `@base-ui/react`.

**Tried:**
- Nothing — identified from TypeScript check output

**Fix:**
Base UI uses `render` prop for polymorphism, not `asChild`. Examples:
- `<Button render={<Link href="..." />}>text</Button>` for link buttons
- `<DropdownMenuTrigger>` — just put content directly inside, no asChild needed
- `<DropdownMenuItem onClick={() => router.push(...)}>` — use click handlers instead of asChild

---

### Issue 5: `datasourceUrl` not in Prisma 7 TypeScript types
**Problem:** Pre-existing TypeScript error: `'datasourceUrl' does not exist in type 'Subset<PrismaClientOptions, PrismaClientOptions>'`.

**Root Cause:** Prisma 7 removed `datasourceUrl` from `PrismaClientOptions` type. Datasource configuration is now done via `prisma.config.ts` (for CLI) or driver adapter (for runtime).

**Fix:** Switched to `@prisma/adapter-pg` driver adapter which completely replaces the need for `datasourceUrl` in the constructor.
