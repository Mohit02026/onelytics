export interface Ga4Overview {
  sessions: number
  users: number
  bounceRate: number
  avgSessionDuration: number // seconds
}

export interface Ga4DailyRow {
  date: string // "YYYY-MM-DD"
  sessions: number
  users: number
}

export interface Ga4TrafficSource {
  source: string
  sessions: number
  percentage: number
}

export interface Ga4Report {
  overview: Ga4Overview
  daily: Ga4DailyRow[]
  trafficSources: Ga4TrafficSource[]
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

  const [dailyRes, sourcesRes] = await Promise.all([
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
        ],
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
        limit: 5,
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

  const [dailyData, sourcesData] = await Promise.all([dailyRes.json(), sourcesRes.json()])

  // GA4 returns dates as "YYYYMMDD" — normalise to "YYYY-MM-DD"
  const daily: Ga4DailyRow[] = (dailyData.rows ?? []).map((row: Record<string, { value: string }[]>) => ({
    date: (row.dimensionValues[0].value as string).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
    sessions: parseInt(row.metricValues[0].value, 10),
    users: parseInt(row.metricValues[1].value, 10),
  }))

  const totals = dailyData.totals?.[0]?.metricValues ?? []
  const totalSessions = parseInt(totals[0]?.value ?? '0', 10)
  const totalUsers = parseInt(totals[1]?.value ?? '0', 10)
  // GA4 returns bounceRate as a ratio (0–1); convert to percentage
  const bounceRate = Math.round(parseFloat(totals[2]?.value ?? '0') * 1000) / 10
  const avgDuration = Math.round(parseFloat(totals[3]?.value ?? '0'))

  const totalSourceSessions = (sourcesData.rows ?? []).reduce(
    (sum: number, r: Record<string, { value: string }[]>) =>
      sum + parseInt(r.metricValues[0].value, 10),
    0
  )
  const trafficSources: Ga4TrafficSource[] = (sourcesData.rows ?? []).map(
    (row: Record<string, { value: string }[]>) => {
      const sessions = parseInt(row.metricValues[0].value, 10)
      return {
        source: row.dimensionValues[0].value,
        sessions,
        percentage:
          totalSourceSessions > 0
            ? Math.round((sessions / totalSourceSessions) * 100)
            : 0,
      }
    }
  )

  return {
    overview: { sessions: totalSessions, users: totalUsers, bounceRate, avgSessionDuration: avgDuration },
    daily,
    trafficSources,
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

  const daily: Ga4DailyRow[] = days.map((d) => {
    const seed = d.getTime() / 1_000_000
    const sessions = Math.floor(320 + seeded(seed) * 280)
    const users = Math.floor(sessions * (0.72 + seeded(seed + 2) * 0.18))
    totalSessions += sessions
    totalUsers += users
    return { date: d.toISOString().split('T')[0], sessions, users }
  })

  return {
    overview: {
      sessions: totalSessions,
      users: totalUsers,
      bounceRate: 47.3,
      avgSessionDuration: 152,
    },
    daily,
    trafficSources: [
      { source: 'Organic Search', sessions: Math.floor(totalSessions * 0.42), percentage: 42 },
      { source: 'Direct', sessions: Math.floor(totalSessions * 0.26), percentage: 26 },
      { source: 'Referral', sessions: Math.floor(totalSessions * 0.18), percentage: 18 },
      { source: 'Social', sessions: Math.floor(totalSessions * 0.14), percentage: 14 },
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
