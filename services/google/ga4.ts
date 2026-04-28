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

// Seeded pseudo-random so dummy data is stable per date, not random on every request
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

export async function getGa4Report(
  _workspaceId: string,
  _propertyId: string,
  startDate: string,
  endDate: string
): Promise<Ga4Report> {
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
