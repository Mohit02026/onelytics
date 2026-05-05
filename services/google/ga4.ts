export interface Ga4Overview {
  sessions: number
  users: number
  bounceRate: number
  avgSessionDuration: number // seconds
  pageviews: number
  newUsers: number
}

export interface Ga4DailyRow {
  date: string // "YYYY-MM-DD"
  sessions: number
  users: number
  pageviews: number
}

export interface Ga4TrafficSource {
  source: string
  sessions: number
  percentage: number
}

export interface Ga4TopPage {
  page: string
  pageviews: number
  percentage: number
  avgTimeOnPage: number // seconds
}

export interface Ga4DeviceRow {
  device: string
  sessions: number
  percentage: number
}

export interface Ga4CountryRow {
  country: string
  sessions: number
  percentage: number
}

export interface Ga4Report {
  overview: Ga4Overview
  daily: Ga4DailyRow[]
  trafficSources: Ga4TrafficSource[]
  topPages: Ga4TopPage[]
  deviceBreakdown: Ga4DeviceRow[]
  countryBreakdown: Ga4CountryRow[]
  dateRange: { startDate: string; endDate: string }
}

// ─── Real GA4 Data API ────────────────────────────────────────────────────────

export async function getGa4ReportFromApi(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Ga4Report> {
  const base = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  const [dailyRes, sourcesRes, pagesRes, deviceRes, countryRes] = await Promise.all([
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'screenPageViews' },
          { name: 'newUsers' },
        ],
        metricAggregations: ['TOTAL'],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    }),
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),
    }),
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
    }),
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),
    }),
    fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
    }),
  ])

  if (!dailyRes.ok) {
    const err = await dailyRes.json().catch(() => ({}))
    throw new Error(`GA4 API error: ${err.error?.message ?? dailyRes.status}`)
  }
  if (!sourcesRes.ok) {
    const err = await sourcesRes.json().catch(() => ({}))
    throw new Error(`GA4 sources API error: ${err.error?.message ?? sourcesRes.status}`)
  }

  type Row = { dimensionValues: { value: string }[]; metricValues: { value: string }[] }
  const [dailyData, sourcesData, pagesData, deviceData, countryData] = await Promise.all([
    dailyRes.json(),
    sourcesRes.json(),
    pagesRes.ok ? pagesRes.json() : { rows: [] },
    deviceRes.ok ? deviceRes.json() : { rows: [] },
    countryRes.ok ? countryRes.json() : { rows: [] },
  ])

  // GA4 returns dates as "YYYYMMDD" — normalise to "YYYY-MM-DD"
  const daily: Ga4DailyRow[] = (dailyData.rows ?? []).map((row: Row) => ({
    date: (row.dimensionValues[0].value).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
    sessions: parseInt(row.metricValues[0].value, 10),
    users: parseInt(row.metricValues[1].value, 10),
    pageviews: parseInt(row.metricValues[4].value, 10),
  }))

  const totals = dailyData.totals?.[0]?.metricValues ?? []
  const totalSessions = parseInt(totals[0]?.value ?? '0', 10)
  const totalUsers = parseInt(totals[1]?.value ?? '0', 10)
  // GA4 returns bounceRate as a ratio (0–1); convert to percentage
  const bounceRate = Math.round(parseFloat(totals[2]?.value ?? '0') * 1000) / 10
  const avgDuration = Math.round(parseFloat(totals[3]?.value ?? '0'))
  const totalPageviews = parseInt(totals[4]?.value ?? '0', 10)
  const totalNewUsers = parseInt(totals[5]?.value ?? '0', 10)

  const totalSourceSessions = (sourcesData.rows ?? []).reduce(
    (sum: number, r: Row) => sum + parseInt(r.metricValues[0].value, 10),
    0
  )
  const trafficSources: Ga4TrafficSource[] = (sourcesData.rows ?? []).map((row: Row) => {
    const sessions = parseInt(row.metricValues[0].value, 10)
    return {
      source: row.dimensionValues[0].value,
      sessions,
      percentage: totalSourceSessions > 0 ? Math.round((sessions / totalSourceSessions) * 100) : 0,
    }
  })

  const totalPageviewsForPages = (pagesData.rows ?? []).reduce(
    (sum: number, r: Row) => sum + parseInt(r.metricValues[0].value, 10),
    0
  )
  const topPages: Ga4TopPage[] = (pagesData.rows ?? []).map((row: Row) => {
    const pageviews = parseInt(row.metricValues[0].value, 10)
    return {
      page: row.dimensionValues[0].value,
      pageviews,
      percentage: totalPageviewsForPages > 0 ? Math.round((pageviews / totalPageviewsForPages) * 100) : 0,
      avgTimeOnPage: Math.round(parseFloat(row.metricValues[1].value ?? '0')),
    }
  })

  const totalDeviceSessions = (deviceData.rows ?? []).reduce(
    (sum: number, r: Row) => sum + parseInt(r.metricValues[0].value, 10),
    0
  )
  const deviceBreakdown: Ga4DeviceRow[] = (deviceData.rows ?? []).map((row: Row) => {
    const sessions = parseInt(row.metricValues[0].value, 10)
    return {
      device: row.dimensionValues[0].value,
      sessions,
      percentage: totalDeviceSessions > 0 ? Math.round((sessions / totalDeviceSessions) * 100) : 0,
    }
  })

  const totalCountrySessions = (countryData.rows ?? []).reduce(
    (sum: number, r: Row) => sum + parseInt(r.metricValues[0].value, 10),
    0
  )
  const countryBreakdown: Ga4CountryRow[] = (countryData.rows ?? []).map((row: Row) => {
    const sessions = parseInt(row.metricValues[0].value, 10)
    return {
      country: row.dimensionValues[0].value,
      sessions,
      percentage: totalCountrySessions > 0 ? Math.round((sessions / totalCountrySessions) * 100) : 0,
    }
  })

  return {
    overview: {
      sessions: totalSessions,
      users: totalUsers,
      bounceRate,
      avgSessionDuration: avgDuration,
      pageviews: totalPageviews,
      newUsers: totalNewUsers,
    },
    daily,
    trafficSources,
    topPages,
    deviceBreakdown,
    countryBreakdown,
    dateRange: { startDate, endDate },
  }
}

// ─── Dummy data (used when no real credentials are present) ──────────────────

function seeded(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function daysInRange(startDate: string, endDate: string): Date[] {
  const days: Date[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function getGa4ReportDummy(startDate: string, endDate: string): Ga4Report {
  const days = daysInRange(startDate, endDate)
  let totalSessions = 0
  let totalUsers = 0
  let totalPageviews = 0

  const daily: Ga4DailyRow[] = days.map((d) => {
    const seed = d.getTime() / 1_000_000
    const sessions = Math.floor(320 + seeded(seed) * 280)
    const users = Math.floor(sessions * (0.72 + seeded(seed + 2) * 0.18))
    const pageviews = Math.floor(sessions * (2.1 + seeded(seed + 4) * 1.2))
    totalSessions += sessions
    totalUsers += users
    totalPageviews += pageviews
    return { date: d.toISOString().split('T')[0], sessions, users, pageviews }
  })

  const newUsers = Math.floor(totalUsers * 0.38)

  return {
    overview: {
      sessions: totalSessions,
      users: totalUsers,
      bounceRate: 47.3,
      avgSessionDuration: 152,
      pageviews: totalPageviews,
      newUsers,
    },
    daily,
    trafficSources: [
      { source: 'Organic Search', sessions: Math.floor(totalSessions * 0.42), percentage: 42 },
      { source: 'Direct', sessions: Math.floor(totalSessions * 0.26), percentage: 26 },
      { source: 'Referral', sessions: Math.floor(totalSessions * 0.18), percentage: 18 },
      { source: 'Social', sessions: Math.floor(totalSessions * 0.14), percentage: 14 },
    ],
    topPages: [
      { page: '/', pageviews: Math.floor(totalPageviews * 0.28), percentage: 28, avgTimeOnPage: 92 },
      { page: '/blog/ga4-migration-guide', pageviews: Math.floor(totalPageviews * 0.14), percentage: 14, avgTimeOnPage: 248 },
      { page: '/pricing', pageviews: Math.floor(totalPageviews * 0.11), percentage: 11, avgTimeOnPage: 74 },
      { page: '/features', pageviews: Math.floor(totalPageviews * 0.10), percentage: 10, avgTimeOnPage: 118 },
      { page: '/blog/meta-ads-roas', pageviews: Math.floor(totalPageviews * 0.09), percentage: 9, avgTimeOnPage: 204 },
      { page: '/contact', pageviews: Math.floor(totalPageviews * 0.07), percentage: 7, avgTimeOnPage: 61 },
      { page: '/blog/google-ads-quality-score', pageviews: Math.floor(totalPageviews * 0.06), percentage: 6, avgTimeOnPage: 183 },
      { page: '/about', pageviews: Math.floor(totalPageviews * 0.05), percentage: 5, avgTimeOnPage: 45 },
      { page: '/blog/utm-parameters', pageviews: Math.floor(totalPageviews * 0.05), percentage: 5, avgTimeOnPage: 167 },
      { page: '/integrations', pageviews: Math.floor(totalPageviews * 0.05), percentage: 5, avgTimeOnPage: 89 },
    ],
    deviceBreakdown: [
      { device: 'mobile', sessions: Math.floor(totalSessions * 0.58), percentage: 58 },
      { device: 'desktop', sessions: Math.floor(totalSessions * 0.35), percentage: 35 },
      { device: 'tablet', sessions: Math.floor(totalSessions * 0.07), percentage: 7 },
    ],
    countryBreakdown: [
      { country: 'United States', sessions: Math.floor(totalSessions * 0.32), percentage: 32 },
      { country: 'India', sessions: Math.floor(totalSessions * 0.18), percentage: 18 },
      { country: 'United Kingdom', sessions: Math.floor(totalSessions * 0.10), percentage: 10 },
      { country: 'Canada', sessions: Math.floor(totalSessions * 0.07), percentage: 7 },
      { country: 'Australia', sessions: Math.floor(totalSessions * 0.06), percentage: 6 },
      { country: 'Germany', sessions: Math.floor(totalSessions * 0.05), percentage: 5 },
      { country: 'France', sessions: Math.floor(totalSessions * 0.04), percentage: 4 },
      { country: 'Brazil', sessions: Math.floor(totalSessions * 0.04), percentage: 4 },
      { country: 'Netherlands', sessions: Math.floor(totalSessions * 0.03), percentage: 3 },
      { country: 'Other', sessions: Math.floor(totalSessions * 0.11), percentage: 11 },
    ],
    dateRange: { startDate, endDate },
  }
}

// ─── Public entrypoint — routes call this only ───────────────────────────────

export const DUMMY_TOKEN = 'dummy_access_token'

export async function getGa4Report(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Ga4Report> {
  if (accessToken === DUMMY_TOKEN) {
    return getGa4ReportDummy(startDate, endDate)
  }
  return getGa4ReportFromApi(accessToken, propertyId, startDate, endDate)
}
