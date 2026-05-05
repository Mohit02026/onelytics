export interface GscOverview {
  clicks: number
  impressions: number
  ctr: number // 0–1
  position: number // avg position (lower = better)
}

export interface GscDailyRow {
  date: string // "YYYY-MM-DD"
  clicks: number
  impressions: number
}

export interface GscKeyword {
  query: string
  clicks: number
  impressions: number
  ctr: number // 0–1
  position: number
}

export interface GscPage {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GscDevice {
  device: string
  clicks: number
  impressions: number
  ctr: number
}

export interface GscCountry {
  country: string
  clicks: number
  impressions: number
}

export interface GscReport {
  overview: GscOverview
  daily: GscDailyRow[]
  keywords: GscKeyword[]
  topPages: GscPage[]
  devices: GscDevice[]
  countries: GscCountry[]
  dateRange: { startDate: string; endDate: string }
}

// ─── Real Google Search Console API ──────────────────────────────────────────
// POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query

export async function getGscReportFromApi(
  accessToken: string,
  siteUrl: string, // e.g. "https://example.com/" or "sc-domain:example.com"
  startDate: string,
  endDate: string
): Promise<GscReport> {
  const encodedSite = encodeURIComponent(siteUrl)
  const base = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  const commonBody = { startDate, endDate }

  const [dailyRes, keywordRes, pagesRes, deviceRes, countryRes] = await Promise.all([
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...commonBody, dimensions: ['date'], rowLimit: 90 }),
    }),
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...commonBody,
        dimensions: ['query'],
        rowLimit: 25,
        orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
      }),
    }),
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...commonBody,
        dimensions: ['page'],
        rowLimit: 10,
        orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
      }),
    }),
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...commonBody, dimensions: ['device'] }),
    }),
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...commonBody,
        dimensions: ['country'],
        rowLimit: 10,
        orderBy: [{ fieldName: 'clicks', sortOrder: 'DESCENDING' }],
      }),
    }),
  ])

  if (!dailyRes.ok) {
    const err = await dailyRes.json().catch(() => ({}))
    throw new Error(`GSC API error: ${err.error?.message ?? dailyRes.status}`)
  }

  type GscApiRow = {
    keys: string[]
    clicks: number
    impressions: number
    ctr: number
    position: number
  }
  const dailyData: { rows?: GscApiRow[] } = await dailyRes.json()
  const keywordData: { rows?: GscApiRow[] } = keywordRes.ok ? await keywordRes.json() : {}
  const pagesData: { rows?: GscApiRow[] } = pagesRes.ok ? await pagesRes.json() : {}
  const deviceData: { rows?: GscApiRow[] } = deviceRes.ok ? await deviceRes.json() : {}
  const countryData: { rows?: GscApiRow[] } = countryRes.ok ? await countryRes.json() : {}

  const daily: GscDailyRow[] = (dailyData.rows ?? []).map((r) => ({
    date: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
  }))

  const keywords: GscKeyword[] = (keywordData.rows ?? []).map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }))

  const topPages: GscPage[] = (pagesData.rows ?? []).map((r) => ({
    page: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }))

  const devices: GscDevice[] = (deviceData.rows ?? []).map((r) => ({
    device: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
  }))

  const countries: GscCountry[] = (countryData.rows ?? []).map((r) => ({
    country: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
  }))

  const overview = daily.reduce(
    (acc, d) => ({ ...acc, clicks: acc.clicks + d.clicks, impressions: acc.impressions + d.impressions }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  )
  overview.ctr = overview.impressions > 0 ? overview.clicks / overview.impressions : 0
  overview.position =
    keywords.length > 0
      ? keywords.reduce((s, k) => s + k.position * k.impressions, 0) /
        keywords.reduce((s, k) => s + k.impressions, 0)
      : 0

  return { overview, daily, keywords, topPages, devices, countries, dateRange: { startDate, endDate } }
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

function seeded(n: number) {
  const x = Math.sin(n + 3) * 10000
  return x - Math.floor(x)
}

export function getGscReportDummy(startDate: string, endDate: string): GscReport {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daily: GscDailyRow[] = []
  let totalClicks = 0
  let totalImpressions = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const seed = d.getTime() / 1_000_000
    const clicks = Math.floor(120 + seeded(seed) * 200)
    const impressions = Math.floor(clicks * (10 + seeded(seed + 1) * 15))
    daily.push({ date: d.toISOString().split('T')[0], clicks, impressions })
    totalClicks += clicks
    totalImpressions += impressions
  }

  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0

  const keywords: GscKeyword[] = [
    { query: 'onelytics dashboard', clicks: Math.floor(totalClicks * 0.18), impressions: Math.floor(totalImpressions * 0.12), ctr: 0.148, position: 2.3 },
    { query: 'marketing analytics tool', clicks: Math.floor(totalClicks * 0.14), impressions: Math.floor(totalImpressions * 0.15), ctr: 0.091, position: 4.1 },
    { query: 'google ads dashboard', clicks: Math.floor(totalClicks * 0.11), impressions: Math.floor(totalImpressions * 0.14), ctr: 0.078, position: 5.7 },
    { query: 'unified analytics platform', clicks: Math.floor(totalClicks * 0.09), impressions: Math.floor(totalImpressions * 0.10), ctr: 0.088, position: 3.9 },
    { query: 'search console analytics', clicks: Math.floor(totalClicks * 0.08), impressions: Math.floor(totalImpressions * 0.09), ctr: 0.084, position: 6.2 },
    { query: 'meta ads reporting', clicks: Math.floor(totalClicks * 0.07), impressions: Math.floor(totalImpressions * 0.08), ctr: 0.081, position: 7.8 },
    { query: 'ga4 reporting tool', clicks: Math.floor(totalClicks * 0.06), impressions: Math.floor(totalImpressions * 0.07), ctr: 0.076, position: 8.4 },
    { query: 'all in one marketing analytics', clicks: Math.floor(totalClicks * 0.05), impressions: Math.floor(totalImpressions * 0.06), ctr: 0.073, position: 9.1 },
    { query: 'roas tracker', clicks: Math.floor(totalClicks * 0.04), impressions: Math.floor(totalImpressions * 0.05), ctr: 0.069, position: 10.3 },
    { query: 'ad spend tracker', clicks: Math.floor(totalClicks * 0.04), impressions: Math.floor(totalImpressions * 0.05), ctr: 0.065, position: 11.7 },
  ]

  const topPages: GscPage[] = [
    { page: 'https://example.com/', clicks: Math.floor(totalClicks * 0.22), impressions: Math.floor(totalImpressions * 0.20), ctr: 0.11, position: 3.2 },
    { page: 'https://example.com/blog/ga4-guide', clicks: Math.floor(totalClicks * 0.16), impressions: Math.floor(totalImpressions * 0.14), ctr: 0.114, position: 2.1 },
    { page: 'https://example.com/pricing', clicks: Math.floor(totalClicks * 0.12), impressions: Math.floor(totalImpressions * 0.11), ctr: 0.109, position: 4.5 },
    { page: 'https://example.com/features', clicks: Math.floor(totalClicks * 0.10), impressions: Math.floor(totalImpressions * 0.12), ctr: 0.083, position: 5.8 },
    { page: 'https://example.com/blog/meta-ads', clicks: Math.floor(totalClicks * 0.09), impressions: Math.floor(totalImpressions * 0.10), ctr: 0.090, position: 6.3 },
    { page: 'https://example.com/integrations', clicks: Math.floor(totalClicks * 0.07), impressions: Math.floor(totalImpressions * 0.09), ctr: 0.078, position: 7.1 },
    { page: 'https://example.com/blog/utm-parameters', clicks: Math.floor(totalClicks * 0.06), impressions: Math.floor(totalImpressions * 0.07), ctr: 0.086, position: 5.4 },
    { page: 'https://example.com/about', clicks: Math.floor(totalClicks * 0.05), impressions: Math.floor(totalImpressions * 0.06), ctr: 0.083, position: 8.9 },
    { page: 'https://example.com/contact', clicks: Math.floor(totalClicks * 0.04), impressions: Math.floor(totalImpressions * 0.05), ctr: 0.080, position: 9.2 },
    { page: 'https://example.com/blog/roas-guide', clicks: Math.floor(totalClicks * 0.04), impressions: Math.floor(totalImpressions * 0.05), ctr: 0.080, position: 7.6 },
  ]

  const devices: GscDevice[] = [
    { device: 'MOBILE', clicks: Math.floor(totalClicks * 0.54), impressions: Math.floor(totalImpressions * 0.58), ctr: 0.093 },
    { device: 'DESKTOP', clicks: Math.floor(totalClicks * 0.39), impressions: Math.floor(totalImpressions * 0.34), ctr: 0.115 },
    { device: 'TABLET', clicks: Math.floor(totalClicks * 0.07), impressions: Math.floor(totalImpressions * 0.08), ctr: 0.088 },
  ]

  const countries: GscCountry[] = [
    { country: 'usa', clicks: Math.floor(totalClicks * 0.34), impressions: Math.floor(totalImpressions * 0.30) },
    { country: 'ind', clicks: Math.floor(totalClicks * 0.16), impressions: Math.floor(totalImpressions * 0.18) },
    { country: 'gbr', clicks: Math.floor(totalClicks * 0.10), impressions: Math.floor(totalImpressions * 0.09) },
    { country: 'can', clicks: Math.floor(totalClicks * 0.07), impressions: Math.floor(totalImpressions * 0.06) },
    { country: 'aus', clicks: Math.floor(totalClicks * 0.06), impressions: Math.floor(totalImpressions * 0.06) },
    { country: 'deu', clicks: Math.floor(totalClicks * 0.05), impressions: Math.floor(totalImpressions * 0.05) },
    { country: 'fra', clicks: Math.floor(totalClicks * 0.04), impressions: Math.floor(totalImpressions * 0.04) },
    { country: 'sgp', clicks: Math.floor(totalClicks * 0.03), impressions: Math.floor(totalImpressions * 0.03) },
    { country: 'nld', clicks: Math.floor(totalClicks * 0.03), impressions: Math.floor(totalImpressions * 0.03) },
    { country: 'bra', clicks: Math.floor(totalClicks * 0.03), impressions: Math.floor(totalImpressions * 0.03) },
  ]

  return {
    overview: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: Math.round(avgCtr * 10000) / 10000,
      position: 5.8,
    },
    daily,
    keywords,
    topPages,
    devices,
    countries,
    dateRange: { startDate, endDate },
  }
}

export const DUMMY_TOKEN = 'dummy_access_token'

export async function getGscReport(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GscReport> {
  if (accessToken === DUMMY_TOKEN) return getGscReportDummy(startDate, endDate)
  return getGscReportFromApi(accessToken, siteUrl, startDate, endDate)
}
