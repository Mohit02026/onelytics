# Onelytics — Phase 1 Physical Verification Guide

Use this guide to boot up the app locally and manually verify every feature built in Phase 1.

---

## Prerequisites

Make sure the following are installed on your machine:

| Tool | Min Version | Check |
|---|---|---|
| Node.js | 18+ | `node -v` |
| Docker Desktop | latest | `docker -v` |
| npm | 9+ | `npm -v` |

---

## Step 1 — Environment Setup

Your `.env` file currently only has `DATABASE_URL`. You need to add the required values below for auth to work.

Open `.env` and ensure it contains:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/onelytics"
REDIS_URL="redis://localhost:6379"

# Generate this with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXTAUTH_SECRET="<paste-generated-secret-here>"

NEXTAUTH_URL="http://localhost:3000"
```

**To generate `NEXTAUTH_SECRET`, run in your terminal:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 2 — Start Docker

```powershell
cd d:\Onelytics
docker-compose up -d
```

**Verify containers are running:**
```powershell
docker ps
```

You should see two containers:
- `onelytics_postgres` — PostgreSQL on port `5432`
- `onelytics_redis` — Redis on port `6379`

---

## Step 3 — Run Database Migration

> ⚠️ **Only run this once.** If you've already migrated, skip to Step 4.

```powershell
npx prisma migrate dev --name init
```

Then generate the Prisma client:
```powershell
npx prisma generate
```

---

## Step 4 — Start the Dev Server

```powershell
npm run dev
```

App will be available at: **http://localhost:3000**

---

## Step 5 — Verification Checklist

Work through each item below and tick it off:

### 🔐 Auth Flow

**Register a new account:**
1. Open http://localhost:3000/register
2. Enter a name, email, and password (min 6 chars)
3. Submit — you should be redirected to the dashboard (`/`)
4. ✅ Check: No error shown, you land on the dashboard

**Log out:**
1. Click your avatar in the top-right corner
2. Click **Log out**
3. ✅ Check: Redirected to `/login`

**Log back in:**
1. Open http://localhost:3000/login
2. Enter the same credentials you registered with
3. ✅ Check: Redirected to the dashboard

**Middleware protection:**
1. Log out
2. Try to manually visit http://localhost:3000/
3. ✅ Check: Redirected to `/login`, cannot access dashboard while logged out

---

### 🗂️ Dashboard Layout

After logging in:

1. ✅ **Sidebar** — visible on the left, 220px wide with logo "O Onelytics"
2. ✅ **Nav links** — Dashboard, Google Analytics, Google Ads, Search Console, Meta Ads, Settings
3. ✅ **Active state** — Dashboard link is highlighted in blue
4. ✅ **Connections badge** — shows `0/4` at the bottom of the sidebar
5. ✅ **Navbar** — shows "Dashboard" title top left, "Last 30 Days" pill, and avatar top right

---

### 🏠 Dashboard Empty State

Open http://localhost:3000/

1. ✅ Welcome heading: "Welcome to Onelytics"
2. ✅ Two integration cards: **Google Analytics** and **Google Ads**
3. ✅ Each card has a **Connect** button (non-functional in Phase 1)

---

### 🔗 Connect Accounts Page

Open http://localhost:3000/connect

1. ✅ Four integration cards visible: GA4, Google Ads, Search Console, Meta Ads
2. ✅ All show "Not Connected" badge
3. ✅ Each has a blue **Connect** button (non-functional in Phase 1)

---

### ⚙️ Settings Page

Open http://localhost:3000/settings

1. ✅ **Workspace Profile** card with an editable input defaulting to "My Workspace"
2. ✅ **Save Changes** button
3. ✅ **Team Members** section with "Coming in Phase 7" placeholder

---

### 🌙 Dark Mode

1. In your OS or browser, toggle to **dark mode**
2. ✅ Sidebar: dark background, white text
3. ✅ Navbar: dark background
4. ✅ Cards: dark gray background with proper borders

---

### 🗄️ Database Sanity Check (Optional)

To verify the workspace + user were created in the DB:

```powershell
npx prisma studio
```

Open http://localhost:5555 — you should see:
- **User** table — 1 row with your email
- **Workspace** table — 1 row auto-created on registration

---

## Known Limitations in Phase 1

| Feature | Status |
|---|---|
| Connect buttons | Non-functional — Phase 2 |
| Date range picker | Placeholder only — Phase 2 |
| Avatar image | Initials only — no photo upload yet |
| Rate limiting | Active only in production (Upstash env vars not set locally) |
| Team Members | Phase 7 |

---

## If Something Goes Wrong

| Issue | Fix |
|---|---|
| `prisma: cannot connect to DB` | Ensure Docker is running: `docker ps` |
| `NEXTAUTH_SECRET is not set` | Add it to `.env` (see Step 1) |
| Page shows blank / hydration error | Stop server, run `npm run dev` again |
| Cannot register — "User already exists" | Use a different email |
| Docker containers not starting | Run `docker-compose down` then `docker-compose up -d` |
