const GRAPH_VERSION = 'v19.0'

export interface MetaOverview {
  spend: number
  reach: number
  impressions: number
  clicks: number
  cpm: number
  ctr: number // percentage (0–100)
  conversions: number
}

export interface MetaDailyRow {
  date: string // "YYYY-MM-DD"
  spend: number
  reach: number
  impressions: number
}

export interface MetaCampaign {
  id: string
  name: string
  status: string
  spend: number
  reach: number
  impressions: number
  clicks: number
  cpm: number
  ctr: number
  conversions: number
}

export interface MetaReport {
  overview: MetaOverview
  daily: MetaDailyRow[]
  campaigns: MetaCampaign[]
  dateRange: { startDate: string; endDate: string }
}

// ─── Real Meta Marketing API ──────────────────────────────────────────────────

type InsightRow = {
  spend?: string
  reach?: string
  impressions?: string
  clicks?: string
  cpm?: string
  ctr?: string
  date_start?: string
  actions?: { action_type: string; value: string }[]
  campaign_id?: string
  campaign_name?: string
}

function parseInsightRow(row: InsightRow) {
  const spend = parseFloat(row.spend ?? '0')
  const reach = parseInt(row.reach ?? '0', 10)
  const impressions = parseInt(row.impressions ?? '0', 10)
  const clicks = parseInt(row.clicks ?? '0', 10)
  const cpm = parseFloat(row.cpm ?? '0')
  const ctr = parseFloat(row.ctr ?? '0')
  const conversions = (row.actions ?? [])
    .filter((a) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')
    .reduce((s, a) => s + parseInt(a.value, 10), 0)
  return { spend, reach, impressions, clicks, cpm, ctr, conversions }
}

export async function getMetaReportFromApi(
  accessToken: string,
  adAccountId: string, // format: act_XXXXXXXXXX
  startDate: string,
  endDate: string
): Promise<MetaReport> {
  const base = `https://graph.facebook.com/${GRAPH_VERSION}`
  const insightFields = 'spend,reach,impressions,clicks,cpm,ctr,actions'

  const [dailyRes, campaignRes] = await Promise.all([
    fetch(
      `${base}/${adAccountId}/insights?fields=${insightFields}&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&limit=90&access_token=${accessToken}`
    ),
    fetch(
      `${base}/${adAccountId}/campaigns?fields=id,name,status,insights.date_preset(lifetime){${insightFields}}&limit=20&access_token=${accessToken}`
    ),
  ])

  if (!dailyRes.ok) {
    const err = await dailyRes.json().catch(() => ({}))
    throw new Error(`Meta API error: ${(err as { error?: { message?: string } }).error?.message ?? dailyRes.status}`)
  }

  const dailyData: { data: (InsightRow & { date_start: string })[] } = await dailyRes.json()
  const campaignData: { data: { id: string; name: string; status: string; insights?: { data: InsightRow[] } }[] } =
    campaignRes.ok ? await campaignRes.json() : { data: [] }

  const daily: MetaDailyRow[] = dailyData.data.map((row) => ({
    date: row.date_start,
    spend: parseFloat(row.spend ?? '0'),
    reach: parseInt(row.reach ?? '0', 10),
    impressions: parseInt(row.impressions ?? '0', 10),
  }))

  const overview = daily.reduce(
    (acc, d) => ({ ...acc, spend: acc.spend + d.spend, reach: acc.reach + d.reach, impressions: acc.impressions + d.impressions }),
    { spend: 0, reach: 0, impressions: 0, clicks: 0, cpm: 0, ctr: 0, conversions: 0 }
  )
  // aggregate clicks/conversions from daily insight rows
  for (const row of dailyData.data) {
    const p = parseInsightRow(row)
    overview.clicks += p.clicks
    overview.conversions += p.conversions
  }
  overview.cpm = overview.impressions > 0 ? (overview.spend / overview.impressions) * 1000 : 0
  overview.ctr = overview.impressions > 0 ? (overview.clicks / overview.impressions) * 100 : 0

  const campaigns: MetaCampaign[] = campaignData.data.map((c) => {
    const insightRow = c.insights?.data?.[0] ?? {}
    const p = parseInsightRow(insightRow)
    return { id: c.id, name: c.name, status: c.status, ...p }
  })

  return {
    overview: {
      spend: Math.round(overview.spend * 100) / 100,
      reach: overview.reach,
      impressions: overview.impressions,
      clicks: overview.clicks,
      cpm: Math.round(overview.cpm * 100) / 100,
      ctr: Math.round(overview.ctr * 100) / 100,
      conversions: overview.conversions,
    },
    daily,
    campaigns,
    dateRange: { startDate, endDate },
  }
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

function seeded(n: number) {
  const x = Math.sin(n + 5) * 10000
  return x - Math.floor(x)
}

export function getMetaReportDummy(startDate: string, endDate: string): MetaReport {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daily: MetaDailyRow[] = []
  let totalSpend = 0
  let totalReach = 0
  let totalImpressions = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const seed = d.getTime() / 1_000_000
    const spend = Math.round((55 + seeded(seed) * 95) * 100) / 100
    const reach = Math.floor(1800 + seeded(seed + 1) * 2400)
    const impressions = Math.floor(reach * (1.4 + seeded(seed + 2) * 0.8))
    daily.push({ date: d.toISOString().split('T')[0], spend, reach, impressions })
    totalSpend += spend
    totalReach += reach
    totalImpressions += impressions
  }

  const totalClicks = Math.floor(totalImpressions * 0.022)
  const totalConversions = Math.floor(totalClicks * 0.038)
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  return {
    overview: {
      spend: Math.round(totalSpend * 100) / 100,
      reach: totalReach,
      impressions: totalImpressions,
      clicks: totalClicks,
      cpm: Math.round(cpm * 100) / 100,
      ctr: Math.round(ctr * 100) / 100,
      conversions: totalConversions,
    },
    daily,
    campaigns: [
      {
        id: 'c1', name: 'Awareness — Broad Audience', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.30 * 100) / 100,
        reach: Math.floor(totalReach * 0.38), impressions: Math.floor(totalImpressions * 0.35),
        clicks: Math.floor(totalClicks * 0.28), cpm: 9.2, ctr: 1.6, conversions: 0,
      },
      {
        id: 'c2', name: 'Retargeting — Website Visitors', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.28 * 100) / 100,
        reach: Math.floor(totalReach * 0.22), impressions: Math.floor(totalImpressions * 0.25),
        clicks: Math.floor(totalClicks * 0.34), cpm: 18.4, ctr: 3.8, conversions: Math.floor(totalConversions * 0.52),
      },
      {
        id: 'c3', name: 'Conversion — Lookalike 1%', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.24 * 100) / 100,
        reach: Math.floor(totalReach * 0.25), impressions: Math.floor(totalImpressions * 0.24),
        clicks: Math.floor(totalClicks * 0.25), cpm: 16.1, ctr: 2.9, conversions: Math.floor(totalConversions * 0.35),
      },
      {
        id: 'c4', name: 'Lead Gen — Interest Targeting', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.18 * 100) / 100,
        reach: Math.floor(totalReach * 0.15), impressions: Math.floor(totalImpressions * 0.16),
        clicks: Math.floor(totalClicks * 0.13), cpm: 17.8, ctr: 2.2, conversions: Math.floor(totalConversions * 0.13),
      },
    ],
    dateRange: { startDate, endDate },
  }
}

export const DUMMY_TOKEN = 'dummy_meta_token'

export async function getMetaReport(
  accessToken: string,
  adAccountId: string,
  startDate: string,
  endDate: string
): Promise<MetaReport> {
  if (accessToken === DUMMY_TOKEN) return getMetaReportDummy(startDate, endDate)
  return getMetaReportFromApi(accessToken, adAccountId, startDate, endDate)
}
