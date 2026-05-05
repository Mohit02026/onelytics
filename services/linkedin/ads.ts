const API_BASE = 'https://api.linkedin.com/rest'

export interface LinkedInOverview {
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  conversions: number
  costPerConversion: number
  likes: number
  comments: number
  shares: number
  follows: number
  engagementRate: number
}

export interface LinkedInDailyRow {
  date: string
  spend: number
  impressions: number
  clicks: number
  likes: number
  comments: number
  shares: number
}

export interface LinkedInCampaign {
  id: string
  name: string
  status: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  conversions: number
  likes: number
  comments: number
  shares: number
}

export interface LinkedInDemographic {
  segment: string
  impressions: number
  clicks: number
  percentage: number
}

export interface LinkedInReport {
  overview: LinkedInOverview
  daily: LinkedInDailyRow[]
  campaigns: LinkedInCampaign[]
  jobFunctionBreakdown: LinkedInDemographic[]
  seniorityBreakdown: LinkedInDemographic[]
  dateRange: { startDate: string; endDate: string }
}

// ─── Real LinkedIn Marketing API ──────────────────────────────────────────────

type LiAnalyticsRow = {
  dateRange?: { start: { year: number; month: number; day: number } }
  pivotValues?: string[]
  costInLocalCurrency?: string
  impressions?: number
  clicks?: number
  externalWebsiteConversions?: number
  likes?: number
  comments?: number
  shares?: number
  follows?: number
  pivotType?: string
}

function parseLi(row: LiAnalyticsRow) {
  const spend = parseFloat(row.costInLocalCurrency ?? '0')
  const impressions = row.impressions ?? 0
  const clicks = row.clicks ?? 0
  const conversions = row.externalWebsiteConversions ?? 0
  const likes = row.likes ?? 0
  const comments = row.comments ?? 0
  const shares = row.shares ?? 0
  const follows = row.follows ?? 0
  return { spend, impressions, clicks, conversions, likes, comments, shares, follows }
}

function liDate(d: { year: number; month: number; day: number }) {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

export async function getLinkedInReportFromApi(
  accessToken: string,
  accountId: string, // format: urn:li:sponsoredAccount:XXXXXXXXXX
  startDate: string,
  endDate: string
): Promise<LinkedInReport> {
  const [sy, sm, sd] = startDate.split('-').map(Number)
  const [ey, em, ed] = endDate.split('-').map(Number)

  const dateParams =
    `dateRange.start.day=${sd}&dateRange.start.month=${sm}&dateRange.start.year=${sy}` +
    `&dateRange.end.day=${ed}&dateRange.end.month=${em}&dateRange.end.year=${ey}`

  const fields = 'costInLocalCurrency,impressions,clicks,externalWebsiteConversions,likes,comments,shares,follows,dateRange,pivotValues'

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'LinkedIn-Version': '202401',
    'X-Restli-Protocol-Version': '2.0.0',
  }

  const [dailyRes, campaignRes, jobFunctionRes, seniorityRes] = await Promise.all([
    fetch(
      `${API_BASE}/adAnalytics?q=analytics&pivot=MEMBER_COMPANY_SIZE&timeGranularity=DAILY` +
        `&accounts=List(${encodeURIComponent(accountId)})&${dateParams}&fields=${fields}&count=90`,
      { headers }
    ),
    fetch(
      `${API_BASE}/adAnalytics?q=analytics&pivot=CAMPAIGN&timeGranularity=ALL` +
        `&accounts=List(${encodeURIComponent(accountId)})&${dateParams}&fields=${fields}&count=20`,
      { headers }
    ),
    fetch(
      `${API_BASE}/adAnalytics?q=analytics&pivot=MEMBER_JOB_FUNCTION&timeGranularity=ALL` +
        `&accounts=List(${encodeURIComponent(accountId)})&${dateParams}&fields=impressions,clicks,pivotValues&count=15`,
      { headers }
    ),
    fetch(
      `${API_BASE}/adAnalytics?q=analytics&pivot=MEMBER_SENIORITY&timeGranularity=ALL` +
        `&accounts=List(${encodeURIComponent(accountId)})&${dateParams}&fields=impressions,clicks,pivotValues&count=10`,
      { headers }
    ),
  ])

  if (!dailyRes.ok) throw new Error(`LinkedIn API error: ${dailyRes.status}`)
  const dailyData: { elements: LiAnalyticsRow[] } = await dailyRes.json()
  const campaignData: { elements: LiAnalyticsRow[] } = campaignRes.ok
    ? await campaignRes.json()
    : { elements: [] }
  const jobFunctionData: { elements: LiAnalyticsRow[] } = jobFunctionRes.ok
    ? await jobFunctionRes.json()
    : { elements: [] }
  const seniorityData: { elements: LiAnalyticsRow[] } = seniorityRes.ok
    ? await seniorityRes.json()
    : { elements: [] }

  const daily: LinkedInDailyRow[] = (dailyData.elements ?? []).map((row) => {
    const p = parseLi(row)
    return {
      date: row.dateRange?.start ? liDate(row.dateRange.start) : '',
      spend: p.spend,
      impressions: p.impressions,
      clicks: p.clicks,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
    }
  })

  const overview = daily.reduce(
    (acc, d) => ({
      ...acc,
      spend: acc.spend + d.spend,
      impressions: acc.impressions + d.impressions,
      clicks: acc.clicks + d.clicks,
      likes: acc.likes + d.likes,
      comments: acc.comments + d.comments,
      shares: acc.shares + d.shares,
    }),
    { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpm: 0, conversions: 0, costPerConversion: 0, likes: 0, comments: 0, shares: 0, follows: 0, engagementRate: 0 }
  )
  for (const row of dailyData.elements ?? []) {
    const p = parseLi(row)
    overview.conversions += p.conversions
    overview.follows += p.follows
  }
  overview.ctr = overview.impressions > 0 ? (overview.clicks / overview.impressions) * 100 : 0
  overview.cpm = overview.impressions > 0 ? (overview.spend / overview.impressions) * 1000 : 0
  overview.costPerConversion = overview.conversions > 0 ? overview.spend / overview.conversions : 0
  const totalEngagements = overview.likes + overview.comments + overview.shares + overview.clicks
  overview.engagementRate = overview.impressions > 0 ? (totalEngagements / overview.impressions) * 100 : 0

  const campaigns: LinkedInCampaign[] = (campaignData.elements ?? []).map((row, i) => {
    const p = parseLi(row)
    const ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0
    const cpm = p.impressions > 0 ? (p.spend / p.impressions) * 1000 : 0
    return {
      id: row.pivotValues?.[0] ?? `campaign-${i}`,
      name: row.pivotValues?.[0] ?? 'Campaign',
      status: 'ACTIVE',
      spend: Math.round(p.spend * 100) / 100,
      impressions: p.impressions,
      clicks: p.clicks,
      ctr: Math.round(ctr * 100) / 100,
      cpm: Math.round(cpm * 100) / 100,
      conversions: p.conversions,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
    }
  })

  const totalJfImpressions = (jobFunctionData.elements ?? []).reduce((s, r) => s + (r.impressions ?? 0), 0)
  const jobFunctionBreakdown: LinkedInDemographic[] = (jobFunctionData.elements ?? []).map((row) => ({
    segment: row.pivotValues?.[0] ?? 'Unknown',
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    percentage: totalJfImpressions > 0 ? Math.round(((row.impressions ?? 0) / totalJfImpressions) * 100) : 0,
  }))

  const totalSenImpressions = (seniorityData.elements ?? []).reduce((s, r) => s + (r.impressions ?? 0), 0)
  const seniorityBreakdown: LinkedInDemographic[] = (seniorityData.elements ?? []).map((row) => ({
    segment: row.pivotValues?.[0] ?? 'Unknown',
    impressions: row.impressions ?? 0,
    clicks: row.clicks ?? 0,
    percentage: totalSenImpressions > 0 ? Math.round(((row.impressions ?? 0) / totalSenImpressions) * 100) : 0,
  }))

  return {
    overview: {
      spend: Math.round(overview.spend * 100) / 100,
      impressions: overview.impressions,
      clicks: overview.clicks,
      ctr: Math.round(overview.ctr * 100) / 100,
      cpm: Math.round(overview.cpm * 100) / 100,
      conversions: overview.conversions,
      costPerConversion: Math.round(overview.costPerConversion * 100) / 100,
      likes: overview.likes,
      comments: overview.comments,
      shares: overview.shares,
      follows: overview.follows,
      engagementRate: Math.round(overview.engagementRate * 100) / 100,
    },
    daily,
    campaigns,
    jobFunctionBreakdown,
    seniorityBreakdown,
    dateRange: { startDate, endDate },
  }
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

function seeded(n: number) {
  const x = Math.sin(n + 11) * 10000
  return x - Math.floor(x)
}

export function getLinkedInReportDummy(startDate: string, endDate: string): LinkedInReport {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daily: LinkedInDailyRow[] = []
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalLikes = 0
  let totalComments = 0
  let totalShares = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const seed = d.getTime() / 1_000_000
    const spend = Math.round((30 + seeded(seed) * 70) * 100) / 100
    const impressions = Math.floor(800 + seeded(seed + 1) * 1400)
    const clicks = Math.floor(impressions * (0.008 + seeded(seed + 2) * 0.006))
    const likes = Math.floor(impressions * (0.012 + seeded(seed + 7) * 0.008))
    const comments = Math.floor(impressions * (0.002 + seeded(seed + 8) * 0.002))
    const shares = Math.floor(impressions * (0.003 + seeded(seed + 9) * 0.002))
    daily.push({ date: d.toISOString().split('T')[0], spend, impressions, clicks, likes, comments, shares })
    totalSpend += spend
    totalImpressions += impressions
    totalClicks += clicks
    totalLikes += likes
    totalComments += comments
    totalShares += shares
  }

  const totalConversions = Math.floor(totalClicks * 0.065)
  const totalFollows = Math.floor(totalImpressions * 0.002)
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
  const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0
  const totalEngagements = totalLikes + totalComments + totalShares + totalClicks
  const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0

  return {
    overview: {
      spend: Math.round(totalSpend * 100) / 100,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: Math.round(ctr * 100) / 100,
      cpm: Math.round(cpm * 100) / 100,
      conversions: totalConversions,
      costPerConversion: Math.round(costPerConversion * 100) / 100,
      likes: totalLikes,
      comments: totalComments,
      shares: totalShares,
      follows: totalFollows,
      engagementRate: Math.round(engagementRate * 100) / 100,
    },
    daily,
    campaigns: [
      {
        id: 'li1', name: 'B2B SaaS — Decision Makers', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.35 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.36),
        clicks: Math.floor(totalClicks * 0.30),
        ctr: 0.9, cpm: 42.5, conversions: Math.floor(totalConversions * 0.40),
        likes: Math.floor(totalLikes * 0.32), comments: Math.floor(totalComments * 0.28), shares: Math.floor(totalShares * 0.30),
      },
      {
        id: 'li2', name: 'Lead Gen Form — Enterprise', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.30 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.28),
        clicks: Math.floor(totalClicks * 0.32),
        ctr: 1.3, cpm: 49.1, conversions: Math.floor(totalConversions * 0.38),
        likes: Math.floor(totalLikes * 0.28), comments: Math.floor(totalComments * 0.35), shares: Math.floor(totalShares * 0.25),
      },
      {
        id: 'li3', name: 'Retargeting — Website Visitors', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.22 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.20),
        clicks: Math.floor(totalClicks * 0.25),
        ctr: 1.4, cpm: 51.3, conversions: Math.floor(totalConversions * 0.15),
        likes: Math.floor(totalLikes * 0.22), comments: Math.floor(totalComments * 0.20), shares: Math.floor(totalShares * 0.28),
      },
      {
        id: 'li4', name: 'Brand Awareness — IT Pros', status: 'PAUSED',
        spend: Math.round(totalSpend * 0.13 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.16),
        clicks: Math.floor(totalClicks * 0.13),
        ctr: 0.8, cpm: 37.2, conversions: Math.floor(totalConversions * 0.07),
        likes: Math.floor(totalLikes * 0.18), comments: Math.floor(totalComments * 0.17), shares: Math.floor(totalShares * 0.17),
      },
    ],
    jobFunctionBreakdown: [
      { segment: 'Information Technology', impressions: Math.floor(totalImpressions * 0.22), clicks: Math.floor(totalClicks * 0.24), percentage: 22 },
      { segment: 'Marketing', impressions: Math.floor(totalImpressions * 0.18), clicks: Math.floor(totalClicks * 0.20), percentage: 18 },
      { segment: 'Operations', impressions: Math.floor(totalImpressions * 0.14), clicks: Math.floor(totalClicks * 0.12), percentage: 14 },
      { segment: 'Finance', impressions: Math.floor(totalImpressions * 0.11), clicks: Math.floor(totalClicks * 0.10), percentage: 11 },
      { segment: 'Sales', impressions: Math.floor(totalImpressions * 0.10), clicks: Math.floor(totalClicks * 0.13), percentage: 10 },
      { segment: 'Business Development', impressions: Math.floor(totalImpressions * 0.09), clicks: Math.floor(totalClicks * 0.08), percentage: 9 },
      { segment: 'Other', impressions: Math.floor(totalImpressions * 0.16), clicks: Math.floor(totalClicks * 0.13), percentage: 16 },
    ],
    seniorityBreakdown: [
      { segment: 'Senior', impressions: Math.floor(totalImpressions * 0.30), clicks: Math.floor(totalClicks * 0.32), percentage: 30 },
      { segment: 'Manager', impressions: Math.floor(totalImpressions * 0.25), clicks: Math.floor(totalClicks * 0.27), percentage: 25 },
      { segment: 'Director', impressions: Math.floor(totalImpressions * 0.18), clicks: Math.floor(totalClicks * 0.16), percentage: 18 },
      { segment: 'Entry', impressions: Math.floor(totalImpressions * 0.12), clicks: Math.floor(totalClicks * 0.10), percentage: 12 },
      { segment: 'VP', impressions: Math.floor(totalImpressions * 0.09), clicks: Math.floor(totalClicks * 0.09), percentage: 9 },
      { segment: 'CXO', impressions: Math.floor(totalImpressions * 0.06), clicks: Math.floor(totalClicks * 0.06), percentage: 6 },
    ],
    dateRange: { startDate, endDate },
  }
}

export const DUMMY_TOKEN = 'dummy_linkedin_token'

export async function getLinkedInReport(
  accessToken: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<LinkedInReport> {
  if (accessToken === DUMMY_TOKEN) return getLinkedInReportDummy(startDate, endDate)
  return getLinkedInReportFromApi(accessToken, accountId, startDate, endDate)
}
