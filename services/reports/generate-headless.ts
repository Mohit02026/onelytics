// Headless counterpart to generateReport() in generate.ts — same output shape,
// sourced by calling the platform fetchers directly instead of forwarding a
// session cookie to the app's own /api/analytics/* routes. Used by scheduled
// jobs, which have no request/session to forward.

import { assembleReportData, prevRange, type ReportData } from '@/services/reports/generate'
import {
  fetchGa4, fetchAds, fetchMeta, fetchGsc, fetchTikTok, fetchLinkedIn, fetchGbp, fetchWordPress,
} from '@/services/reports/fetch-platform-data'

const ALL_PLATFORMS = ['googleAds', 'meta', 'tiktok', 'linkedin', 'ga4', 'gsc', 'gbp', 'wordpress']

const FETCHERS: Record<string, (workspaceId: string, s: string, e: string) => Promise<Record<string, unknown> | null>> = {
  googleAds: fetchAds,
  meta: fetchMeta,
  tiktok: fetchTikTok,
  linkedin: fetchLinkedIn,
  ga4: fetchGa4,
  gsc: fetchGsc,
  gbp: fetchGbp,
}

export async function generateReportForWorkspace(
  workspaceId: string,
  startDate: string,
  endDate: string,
  title: string,
  selectedPlatforms?: string[]
): Promise<ReportData> {
  const prev = prevRange(startDate, endDate)
  const sel = selectedPlatforms ?? ALL_PLATFORMS
  const has = (id: string) => sel.includes(id)

  const dateRangePlatforms = Object.keys(FETCHERS).filter(has)

  // Each platform fetch is isolated — one integration erroring (network blip,
  // expired token, provider outage) must not blank out the other platforms'
  // data for the whole report. Matches generateReport()'s per-fetch .catch().
  const safeFetch = (id: string, s: string, e: string) =>
    FETCHERS[id](workspaceId, s, e).catch((err) => {
      console.error(`[generate-headless] ${id} fetch failed for workspace ${workspaceId}:`, err)
      return null
    })

  const [current, previous, wordpress] = await Promise.all([
    Promise.all(dateRangePlatforms.map((id) => safeFetch(id, startDate, endDate))),
    Promise.all(dateRangePlatforms.map((id) => safeFetch(id, prev.startDate, prev.endDate))),
    has('wordpress')
      ? fetchWordPress(workspaceId, startDate, endDate).catch((err) => {
          console.error(`[generate-headless] wordpress fetch failed for workspace ${workspaceId}:`, err)
          return null
        })
      : Promise.resolve(null),
  ])

  const cur: Record<string, unknown> = {}
  const prv: Record<string, unknown> = {}
  dateRangePlatforms.forEach((id, i) => {
    cur[id] = current[i]
    prv[id] = previous[i]
  })

  return assembleReportData({
    title,
    startDate,
    endDate,
    prev,
    sel,
    ga4: (cur.ga4 ?? null) as Record<string, unknown> | null,
    ads: (cur.googleAds ?? null) as Record<string, unknown> | null,
    meta: (cur.meta ?? null) as Record<string, unknown> | null,
    tiktok: (cur.tiktok ?? null) as Record<string, unknown> | null,
    linkedin: (cur.linkedin ?? null) as Record<string, unknown> | null,
    gsc: (cur.gsc ?? null) as Record<string, unknown> | null,
    gbp: (cur.gbp ?? null) as Record<string, unknown> | null,
    wordpress: wordpress as Record<string, unknown> | null,
    pAds: (prv.googleAds ?? null) as Record<string, unknown> | null,
    pMeta: (prv.meta ?? null) as Record<string, unknown> | null,
    pTiktok: (prv.tiktok ?? null) as Record<string, unknown> | null,
    pLinkedin: (prv.linkedin ?? null) as Record<string, unknown> | null,
    pGa4: (prv.ga4 ?? null) as Record<string, unknown> | null,
    pGsc: (prv.gsc ?? null) as Record<string, unknown> | null,
    pGbp: (prv.gbp ?? null) as Record<string, unknown> | null,
  })
}
