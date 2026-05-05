const API_VERSION = 'v1.3'
const BASE = `https://business-api.tiktok.com/open_api/${API_VERSION}`

export interface TikTokOverview {
  spend: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpm: number
  conversions: number
  cpa: number
  roas: number
  videoViews: number
  videoViewRate: number
  frequency: number
}

export interface TikTokDailyRow {
  date: string
  spend: number
  impressions: number
  reach: number
  clicks: number
  videoViews: number
}

export interface TikTokCampaign {
  id: string
  name: string
  status: string
  spend: number
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpm: number
  conversions: number
  cpa: number
  roas: number
  videoViews: number
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
    reach?: string
    clicks?: string
    ctr?: string
    cpm?: string
    real_time_conversion?: string
    real_time_result?: string
    real_time_cost_per_result?: string
    video_play_actions?: string
    video_watched_2s?: string
    campaign_name?: string
    status?: string
  }
}

function parseStats(m: StatRow['metrics']) {
  const impressions = parseInt(m.impressions ?? '0', 10)
  const videoViews = parseInt(m.video_play_actions ?? '0', 10)
  return {
    spend: parseFloat(m.spend ?? '0'),
    impressions,
    reach: parseInt(m.reach ?? '0', 10),
    clicks: parseInt(m.clicks ?? '0', 10),
    ctr: parseFloat(m.ctr ?? '0'),
    cpm: parseFloat(m.cpm ?? '0'),
    conversions: parseInt(m.real_time_conversion ?? '0', 10),
    roas: parseFloat(m.real_time_result ?? '0'),
    videoViews,
    videoViewRate: impressions > 0 ? (videoViews / impressions) * 100 : 0,
  }
}

export async function getTikTokReportFromApi(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string
): Promise<TikTokReport> {
  const baseMetrics = 'spend,impressions,reach,clicks,ctr,cpm,real_time_conversion,real_time_result,real_time_cost_per_result,video_play_actions'

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

  const daily: TikTokDailyRow[] = (dailyData.data.list ?? []).map((row) => {
    const s = parseStats(row.metrics)
    return {
      date: row.dimensions.stat_time_day?.split(' ')[0] ?? '',
      spend: s.spend,
      impressions: s.impressions,
      reach: s.reach,
      clicks: s.clicks,
      videoViews: s.videoViews,
    }
  })

  const overview = daily.reduce(
    (acc, d) => ({
      ...acc,
      spend: acc.spend + d.spend,
      impressions: acc.impressions + d.impressions,
      reach: acc.reach + d.reach,
      clicks: acc.clicks + d.clicks,
      videoViews: acc.videoViews + d.videoViews,
    }),
    { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0, conversions: 0, cpa: 0, roas: 0, videoViews: 0, videoViewRate: 0, frequency: 0 }
  )
  for (const row of dailyData.data.list ?? []) {
    const s = parseStats(row.metrics)
    overview.conversions += s.conversions
    overview.roas += s.roas
  }
  const rowCount = dailyData.data.list?.length ?? 0
  overview.ctr = overview.impressions > 0 ? (overview.clicks / overview.impressions) * 100 : 0
  overview.cpm = overview.impressions > 0 ? (overview.spend / overview.impressions) * 1000 : 0
  overview.cpa = overview.conversions > 0 ? overview.spend / overview.conversions : 0
  overview.roas = rowCount > 0 ? overview.roas / rowCount : 0
  overview.videoViewRate = overview.impressions > 0 ? (overview.videoViews / overview.impressions) * 100 : 0
  overview.frequency = overview.reach > 0 ? overview.impressions / overview.reach : 0

  const campaigns: TikTokCampaign[] = (campaignData.data?.list ?? []).map((row) => {
    const s = parseStats(row.metrics)
    return {
      id: row.dimensions.campaign_id ?? '',
      name: row.metrics.campaign_name ?? 'Unknown Campaign',
      status: row.metrics.status ?? 'UNKNOWN',
      spend: Math.round(s.spend * 100) / 100,
      impressions: s.impressions,
      reach: s.reach,
      clicks: s.clicks,
      ctr: Math.round(s.ctr * 100) / 100,
      cpm: Math.round(s.cpm * 100) / 100,
      conversions: s.conversions,
      cpa: s.conversions > 0 ? Math.round((s.spend / s.conversions) * 100) / 100 : 0,
      roas: Math.round(s.roas * 100) / 100,
      videoViews: s.videoViews,
    }
  })

  return {
    overview: {
      spend: Math.round(overview.spend * 100) / 100,
      impressions: overview.impressions,
      reach: overview.reach,
      clicks: overview.clicks,
      ctr: Math.round(overview.ctr * 100) / 100,
      cpm: Math.round(overview.cpm * 100) / 100,
      conversions: overview.conversions,
      cpa: Math.round(overview.cpa * 100) / 100,
      roas: Math.round(overview.roas * 100) / 100,
      videoViews: overview.videoViews,
      videoViewRate: Math.round(overview.videoViewRate * 100) / 100,
      frequency: Math.round(overview.frequency * 100) / 100,
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
  let totalReach = 0
  let totalClicks = 0
  let totalVideoViews = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const seed = d.getTime() / 1_000_000
    const spend = Math.round((40 + seeded(seed) * 80) * 100) / 100
    const impressions = Math.floor(5000 + seeded(seed + 1) * 8000)
    const reach = Math.floor(impressions * (0.72 + seeded(seed + 5) * 0.18))
    const clicks = Math.floor(impressions * (0.018 + seeded(seed + 2) * 0.014))
    const videoViews = Math.floor(impressions * (0.55 + seeded(seed + 6) * 0.25))
    daily.push({ date: d.toISOString().split('T')[0], spend, impressions, reach, clicks, videoViews })
    totalSpend += spend
    totalImpressions += impressions
    totalReach += reach
    totalClicks += clicks
    totalVideoViews += videoViews
  }

  const totalConversions = Math.floor(totalClicks * 0.042)
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
  const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const roas = totalSpend > 0 ? (totalConversions * 65) / totalSpend : 0
  const videoViewRate = totalImpressions > 0 ? (totalVideoViews / totalImpressions) * 100 : 0
  const frequency = totalReach > 0 ? totalImpressions / totalReach : 0

  return {
    overview: {
      spend: Math.round(totalSpend * 100) / 100,
      impressions: totalImpressions,
      reach: totalReach,
      clicks: totalClicks,
      ctr: Math.round(ctr * 100) / 100,
      cpm: Math.round(cpm * 100) / 100,
      conversions: totalConversions,
      cpa: Math.round(cpa * 100) / 100,
      roas: Math.round(roas * 100) / 100,
      videoViews: totalVideoViews,
      videoViewRate: Math.round(videoViewRate * 100) / 100,
      frequency: Math.round(frequency * 100) / 100,
    },
    daily,
    campaigns: [
      {
        id: 'tt1', name: 'TopView — Brand Awareness', status: 'ENABLE',
        spend: Math.round(totalSpend * 0.32 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.38),
        reach: Math.floor(totalReach * 0.40),
        clicks: Math.floor(totalClicks * 0.25),
        ctr: 1.8, cpm: 7.4, conversions: 0, cpa: 0, roas: 0,
        videoViews: Math.floor(totalVideoViews * 0.45),
      },
      {
        id: 'tt2', name: 'In-Feed — Retargeting', status: 'ENABLE',
        spend: Math.round(totalSpend * 0.28 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.24),
        reach: Math.floor(totalReach * 0.22),
        clicks: Math.floor(totalClicks * 0.32),
        ctr: 3.7, cpm: 12.9, conversions: Math.floor(totalConversions * 0.55),
        cpa: Math.round((totalSpend * 0.28) / Math.max(1, Math.floor(totalConversions * 0.55)) * 100) / 100,
        roas: 3.2,
        videoViews: Math.floor(totalVideoViews * 0.22),
      },
      {
        id: 'tt3', name: 'Spark Ads — UGC Content', status: 'ENABLE',
        spend: Math.round(totalSpend * 0.24 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.22),
        reach: Math.floor(totalReach * 0.20),
        clicks: Math.floor(totalClicks * 0.28),
        ctr: 3.5, cpm: 11.2, conversions: Math.floor(totalConversions * 0.30),
        cpa: Math.round((totalSpend * 0.24) / Math.max(1, Math.floor(totalConversions * 0.30)) * 100) / 100,
        roas: 2.8,
        videoViews: Math.floor(totalVideoViews * 0.25),
      },
      {
        id: 'tt4', name: 'Brand Takeover — Product Launch', status: 'PAUSED',
        spend: Math.round(totalSpend * 0.16 * 100) / 100,
        impressions: Math.floor(totalImpressions * 0.16),
        reach: Math.floor(totalReach * 0.18),
        clicks: Math.floor(totalClicks * 0.15),
        ctr: 2.6, cpm: 10.7, conversions: Math.floor(totalConversions * 0.15),
        cpa: Math.round((totalSpend * 0.16) / Math.max(1, Math.floor(totalConversions * 0.15)) * 100) / 100,
        roas: 1.9,
        videoViews: Math.floor(totalVideoViews * 0.08),
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
