const API_VERSION = 'v1.3'
const BASE = `https://business-api.tiktok.com/open_api/${API_VERSION}`

export interface TikTokOverview {
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  conversions: number
  cpa: number
}

export interface TikTokDailyRow {
  date: string
  spend: number
  impressions: number
  clicks: number
}

export interface TikTokCampaign {
  id: string
  name: string
  status: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  conversions: number
  cpa: number
}

export interface TikTokReport {
  overview: TikTokOverview
  daily: TikTokDailyRow[]
  campaigns: TikTokCampaign[]
  dateRange: { startDate: string; endDate: string }
}

// ─── Real TikTok Marketing API ────────────────────────────────────────────────

type StatRow = {
  dimensions: { stat_time_day?: string; campaign_id?: string }
  metrics: {
    spend?: string
    impressions?: string
    clicks?: string
    ctr?: string
    cpm?: string
    total_complete_payment_rate?: string
    real_time_conversion?: string
    campaign_name?: string
    campaign_budget_mode?: string
    status?: string
  }
}

function parseStats(m: StatRow['metrics']) {
  return {
    spend: parseFloat(m.spend ?? '0'),
    impressions: parseInt(m.impressions ?? '0', 10),
    clicks: parseInt(m.clicks ?? '0', 10),
    ctr: parseFloat(m.ctr ?? '0'),
    cpm: parseFloat(m.cpm ?? '0'),
    conversions: parseInt(m.real_time_conversion ?? '0', 10),
  }
}

export async function getTikTokReportFromApi(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string
): Promise<TikTokReport> {
  const baseMetrics = 'spend,impressions,clicks,ctr,cpm,real_time_conversion'

  const [dailyRes, campaignRes] = await Promise.all([
    fetch(
      `${BASE}/report/integrated/get/?advertiser_id=${advertiserId}` +
        `&report_type=BASIC&dimensions=["stat_time_day"]&metrics=["${baseMetrics}"]` +
        `&data_level=AUCTION_ADVERTISER&start_date=${startDate}&end_date=${endDate}&page_size=90`,
      { headers: { 'Access-Token': accessToken } }
    ),
    fetch(
      `${BASE}/report/integrated/get/?advertiser_id=${advertiserId}` +
        `&report_type=BASIC&dimensions=["campaign_id"]&metrics=["${baseMetrics},campaign_name,status"]` +
        `&data_level=AUCTION_CAMPAIGN&start_date=${startDate}&end_date=${endDate}&page_size=20`,
      { headers: { 'Access-Token': accessToken } }
    ),
  ])

  if (!dailyRes.ok) throw new Error(`TikTok API error: ${dailyRes.status}`)
  const dailyData: { data: { list: StatRow[] }; code: number; message: string } = await dailyRes.json()
  if (dailyData.code !== 0) throw new Error(`TikTok API error: ${dailyData.message}`)

  const campaignData: { data: { list: StatRow[] }; code: number } = campaignRes.ok
    ? await campaignRes.json()
    : { data: { list: [] }, code: -1 }

  const daily: TikTokDailyRow[] = (dailyData.data.list ?? []).map((row) => ({
    date: row.dimensions.stat_time_day?.split(' ')[0] ?? '',
    ...(() => {
      const s = parseStats(row.metrics)
      return { spend: s.spend, impressions: s.impressions, clicks: s.clicks }
    })(),
  }))

  const overview = daily.reduce(
    (acc, d) => ({ ...acc, spend: acc.spend + d.spend, impressions: acc.impressions + d.impressions, clicks: acc.clicks + d.clicks }),
    { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpm: 0, conversions: 0, cpa: 0 }
  )
  for (const row of dailyData.data.list ?? []) {
    overview.conversions += parseStats(row.metrics).conversions
  }
  overview.ctr = overview.impressions > 0 ? (overview.clicks / overview.impressions) * 100 : 0
  overview.cpm = overview.impressions > 0 ? (overview.spend / overview.impressions) * 1000 : 0
  overview.cpa = overview.conversions > 0 ? overview.spend / overview.conversions : 0

  const campaigns: TikTokCampaign[] = (campaignData.data?.list ?? []).map((row) => {
    const s = parseStats(row.metrics)
    return {
      id: row.dimensions.campaign_id ?? '',
      name: row.metrics.campaign_name ?? 'Unknown Campaign',
      status: row.metrics.status ?? 'UNKNOWN',
      ...s,
      cpa: s.conversions > 0 ? Math.round((s.spend / s.conversions) * 100) / 100 : 0,
    }
  })

  return {
    overview: {
      spend: Math.round(overview.spend * 100) / 100,
      impressions: overview.impressions,
      clicks: overview.clicks,
      ctr: Math.round(overview.ctr * 100) / 100,
      cpm: Math.round(overview.cpm * 100) / 100,
      conversions: overview.conversions,
      cpa: Math.round(overview.cpa * 100) / 100,
    },
    daily,
    campaigns,
    dateRange: { startDate, endDate },
  }
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

function seeded(n: number) {
  const x = Math.sin(n + 9) * 10000
  return x - Math.floor(x)
}

export function getTikTokReportDummy(startDate: string, endDate: string): TikTokReport {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daily: TikTokDailyRow[] = []
  let totalSpend = 0
  let totalImpressions = 0
  let totalClicks = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const seed = d.getTime() / 1_000_000
    const spend = Math.round((40 + seeded(seed) * 80) * 100) / 100
    const impressions = Math.floor(5000 + seeded(seed + 1) * 8000)
    const clicks = Math.floor(impressions * (0.018 + seeded(seed + 2) * 0.014))
    daily.push({ date: d.toISOString().split('T')[0], spend, impressions, clicks })
    totalSpend += spend
    totalImpressions += impressions
    totalClicks += clicks
  }

  const totalConversions = Math.floor(totalClicks * 0.042)
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0

  return {
    overview: {
      spend: Math.round(totalSpend * 100) / 100,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: Math.round(ctr * 100) / 100,
      cpm: Math.round(cpm * 100) / 100,
      conversions: totalConversions,
      cpa: Math.round(cpa * 100) / 100,
    },
    daily,
    campaigns: [
      {
        id: 'tt1', name: 'TopView — Brand Awareness', status: 'ENABLE',
        spend: Math.round(totalSpend * 0.32 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.38),
        clicks: Math.floor(totalClicks * 0.25),
        ctr: 1.8, cpm: 7.4, conversions: 0, cpa: 0,
      },
      {
        id: 'tt2', name: 'In-Feed — Retargeting', status: 'ENABLE',
        spend: Math.round(totalSpend * 0.28 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.24),
        clicks: Math.floor(totalClicks * 0.32),
        ctr: 3.7, cpm: 12.9, conversions: Math.floor(totalConversions * 0.55),
        cpa: Math.round((totalSpend * 0.28) / Math.max(1, Math.floor(totalConversions * 0.55)) * 100) / 100,
      },
      {
        id: 'tt3', name: 'Spark Ads — UGC Content', status: 'ENABLE',
        spend: Math.round(totalSpend * 0.24 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.22),
        clicks: Math.floor(totalClicks * 0.28),
        ctr: 3.5, cpm: 11.2, conversions: Math.floor(totalConversions * 0.30),
        cpa: Math.round((totalSpend * 0.24) / Math.max(1, Math.floor(totalConversions * 0.30)) * 100) / 100,
      },
      {
        id: 'tt4', name: 'Brand Takeover — Product Launch', status: 'PAUSED',
        spend: Math.round(totalSpend * 0.16 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.16),
        clicks: Math.floor(totalClicks * 0.15),
        ctr: 2.6, cpm: 10.7, conversions: Math.floor(totalConversions * 0.15),
        cpa: Math.round((totalSpend * 0.16) / Math.max(1, Math.floor(totalConversions * 0.15)) * 100) / 100,
      },
    ],
    dateRange: { startDate, endDate },
  }
}

export const DUMMY_TOKEN = 'dummy_tiktok_token'

export async function getTikTokReport(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string
): Promise<TikTokReport> {
  if (accessToken === DUMMY_TOKEN) return getTikTokReportDummy(startDate, endDate)
  return getTikTokReportFromApi(accessToken, advertiserId, startDate, endDate)
}
