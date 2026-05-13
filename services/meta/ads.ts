const GRAPH_VERSION = 'v22.0'

export interface MetaOverview {
  spend: number
  reach: number
  impressions: number
  clicks: number
  cpm: number
  ctr: number
  cpa: number
  conversions: number
  roas: number
  frequency: number
  videoViews: number
}

export interface MetaDailyRow {
  date: string
  spend: number
  reach: number
  impressions: number
  clicks: number
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
  cpa: number
  conversions: number
  roas: number
  videoViews: number
}

export interface MetaPlacement {
  platform: string
  position: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

export interface MetaReport {
  overview: MetaOverview
  daily: MetaDailyRow[]
  campaigns: MetaCampaign[]
  placements: MetaPlacement[]
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
  frequency?: string
  date_start?: string
  actions?: { action_type: string; value: string }[]
  action_values?: { action_type: string; value: string }[]
  video_p100_watched_actions?: { action_type: string; value: string }[]
  purchase_roas?: { action_type: string; value: string }[]
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
  const frequency = parseFloat(row.frequency ?? '0')

  const conversions = (row.actions ?? [])
    .filter((a) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')
    .reduce((s, a) => s + parseInt(a.value, 10), 0)

  const purchaseValue = (row.action_values ?? [])
    .filter((a) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase')
    .reduce((s, a) => s + parseFloat(a.value), 0)

  const videoViews = (row.video_p100_watched_actions ?? [])
    .reduce((s, a) => s + parseInt(a.value, 10), 0)

  const roas = row.purchase_roas?.[0] ? parseFloat(row.purchase_roas[0].value) : (spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0)
  const cpa = conversions > 0 ? spend / conversions : 0

  return { spend, reach, impressions, clicks, cpm, ctr, frequency, conversions, purchaseValue, videoViews, roas, cpa }
}

export async function getMetaReportFromApi(
  accessToken: string,
  adAccountId: string,
  startDate: string,
  endDate: string
): Promise<MetaReport> {
  const base = `https://graph.facebook.com/${GRAPH_VERSION}`
  const insightFields = 'spend,reach,impressions,clicks,cpm,ctr,frequency,actions,action_values,purchase_roas,video_p100_watched_actions'

  const timeRange = `{"since":"${startDate}","until":"${endDate}"}`
  const campaignInsightFields = `${insightFields},campaign_id,campaign_name`

  const placementFields = 'spend,impressions,clicks,actions'
  const [dailyRes, campaignListRes, campaignInsightsRes, placementRes] = await Promise.all([
    fetch(
      `${base}/${adAccountId}/insights?fields=${insightFields}&time_range=${timeRange}&time_increment=1&limit=90&access_token=${accessToken}`
    ),
    fetch(
      `${base}/${adAccountId}/campaigns?fields=id,name,status&limit=50&access_token=${accessToken}`
    ),
    fetch(
      `${base}/${adAccountId}/insights?fields=${campaignInsightFields}&time_range=${timeRange}&level=campaign&limit=50&access_token=${accessToken}`
    ),
    fetch(
      `${base}/${adAccountId}/insights?fields=${placementFields}&time_range=${timeRange}&breakdowns=publisher_platform,platform_position&limit=50&access_token=${accessToken}`
    ),
  ])

  if (!dailyRes.ok) {
    const err = await dailyRes.json().catch(() => ({}))
    throw new Error(`Meta API error: ${(err as { error?: { message?: string } }).error?.message ?? dailyRes.status}`)
  }

  const dailyData: { data: (InsightRow & { date_start: string })[] } = await dailyRes.json()
  const campaignListData: { data: { id: string; name: string; status: string }[] } =
    campaignListRes.ok ? await campaignListRes.json() : { data: [] }
  const campaignInsightsData: { data: InsightRow[] } =
    campaignInsightsRes.ok ? await campaignInsightsRes.json() : { data: [] }
  type PlacementRow = { publisher_platform?: string; platform_position?: string; spend?: string; impressions?: string; clicks?: string; actions?: { action_type: string; value: string }[] }
  const placementData: { data: PlacementRow[] } =
    placementRes.ok ? await placementRes.json() : { data: [] }

  const insightsByCampaignId = new Map<string, InsightRow>()
  for (const row of campaignInsightsData.data) {
    if (row.campaign_id) insightsByCampaignId.set(row.campaign_id, row)
  }

  const daily: MetaDailyRow[] = dailyData.data.map((row) => ({
    date: row.date_start ?? '',
    spend: parseFloat(row.spend ?? '0'),
    reach: parseInt(row.reach ?? '0', 10),
    impressions: parseInt(row.impressions ?? '0', 10),
    clicks: parseInt(row.clicks ?? '0', 10),
  }))

  const overviewAcc = { spend: 0, reach: 0, impressions: 0, clicks: 0, cpm: 0, ctr: 0, frequency: 0, conversions: 0, videoViews: 0, roas: 0, cpa: 0 }
  for (const row of dailyData.data) {
    const p = parseInsightRow(row)
    overviewAcc.spend += p.spend
    overviewAcc.reach += p.reach
    overviewAcc.impressions += p.impressions
    overviewAcc.clicks += p.clicks
    overviewAcc.conversions += p.conversions
    overviewAcc.videoViews += p.videoViews
  }
  overviewAcc.cpm = overviewAcc.impressions > 0 ? (overviewAcc.spend / overviewAcc.impressions) * 1000 : 0
  overviewAcc.ctr = overviewAcc.impressions > 0 ? (overviewAcc.clicks / overviewAcc.impressions) * 100 : 0
  overviewAcc.frequency = overviewAcc.reach > 0 ? overviewAcc.impressions / overviewAcc.reach : 0
  overviewAcc.cpa = overviewAcc.conversions > 0 ? overviewAcc.spend / overviewAcc.conversions : 0
  const roasRows = dailyData.data.map(parseInsightRow).filter(r => r.roas > 0)
  overviewAcc.roas = roasRows.length > 0 ? roasRows.reduce((s, r) => s + r.roas, 0) / roasRows.length : 0

  const campaigns: MetaCampaign[] = campaignListData.data.map((c) => {
    const insightRow = insightsByCampaignId.get(c.id) ?? {}
    const p = parseInsightRow(insightRow)
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      spend: Math.round(p.spend * 100) / 100,
      reach: p.reach,
      impressions: p.impressions,
      clicks: p.clicks,
      cpm: Math.round(p.cpm * 100) / 100,
      ctr: Math.round(p.ctr * 100) / 100,
      cpa: Math.round(p.cpa * 100) / 100,
      conversions: p.conversions,
      roas: Math.round(p.roas * 100) / 100,
      videoViews: p.videoViews,
    }
  })

  const placements: MetaPlacement[] = placementData.data.map((row) => ({
    platform: row.publisher_platform ?? 'unknown',
    position: row.platform_position ?? 'unknown',
    spend: parseFloat(row.spend ?? '0'),
    impressions: parseInt(row.impressions ?? '0', 10),
    clicks: parseInt(row.clicks ?? '0', 10),
    conversions: (row.actions ?? []).filter((a) => a.action_type === 'offsite_conversion.fb_pixel_purchase' || a.action_type === 'lead').reduce((s, a) => s + parseFloat(a.value), 0),
  }))

  return {
    overview: {
      spend: Math.round(overviewAcc.spend * 100) / 100,
      reach: overviewAcc.reach,
      impressions: overviewAcc.impressions,
      clicks: overviewAcc.clicks,
      cpm: Math.round(overviewAcc.cpm * 100) / 100,
      ctr: Math.round(overviewAcc.ctr * 100) / 100,
      cpa: Math.round(overviewAcc.cpa * 100) / 100,
      conversions: overviewAcc.conversions,
      roas: Math.round(overviewAcc.roas * 100) / 100,
      frequency: Math.round(overviewAcc.frequency * 100) / 100,
      videoViews: overviewAcc.videoViews,
    },
    daily,
    campaigns,
    placements,
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
  let totalSpend = 0, totalReach = 0, totalImpressions = 0, totalClicks = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const seed = d.getTime() / 1_000_000
    const spend = Math.round((55 + seeded(seed) * 95) * 100) / 100
    const reach = Math.floor(1800 + seeded(seed + 1) * 2400)
    const impressions = Math.floor(reach * (1.4 + seeded(seed + 2) * 0.8))
    const clicks = Math.floor(impressions * (0.018 + seeded(seed + 3) * 0.012))
    daily.push({ date: d.toISOString().split('T')[0], spend, reach, impressions, clicks })
    totalSpend += spend; totalReach += reach; totalImpressions += impressions; totalClicks += clicks
  }

  const totalConversions = Math.floor(totalClicks * 0.038)
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const roas = totalSpend > 0 ? (totalConversions * 85) / totalSpend : 0

  return {
    overview: {
      spend: Math.round(totalSpend * 100) / 100,
      reach: totalReach,
      impressions: totalImpressions,
      clicks: totalClicks,
      cpm: Math.round(cpm * 100) / 100,
      ctr: Math.round(ctr * 100) / 100,
      cpa: totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : 0,
      conversions: totalConversions,
      roas: Math.round(roas * 100) / 100,
      frequency: Math.round((totalImpressions / totalReach) * 100) / 100,
      videoViews: Math.floor(totalImpressions * 0.12),
    },
    daily,
    campaigns: [
      {
        id: 'c1', name: 'Awareness — Broad Audience', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.30 * 100) / 100,
        reach: Math.floor(totalReach * 0.38), impressions: Math.floor(totalImpressions * 0.35),
        clicks: Math.floor(totalClicks * 0.28), cpm: 9.2, ctr: 1.6, conversions: 0, cpa: 0, roas: 0,
        videoViews: Math.floor(totalImpressions * 0.35 * 0.15),
      },
      {
        id: 'c2', name: 'Retargeting — Website Visitors', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.28 * 100) / 100,
        reach: Math.floor(totalReach * 0.22), impressions: Math.floor(totalImpressions * 0.25),
        clicks: Math.floor(totalClicks * 0.34), cpm: 18.4, ctr: 3.8,
        conversions: Math.floor(totalConversions * 0.52),
        cpa: Math.round((totalSpend * 0.28) / Math.max(1, Math.floor(totalConversions * 0.52)) * 100) / 100,
        roas: 4.2, videoViews: 0,
      },
      {
        id: 'c3', name: 'Conversion — Lookalike 1%', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.24 * 100) / 100,
        reach: Math.floor(totalReach * 0.25), impressions: Math.floor(totalImpressions * 0.24),
        clicks: Math.floor(totalClicks * 0.25), cpm: 16.1, ctr: 2.9,
        conversions: Math.floor(totalConversions * 0.35),
        cpa: Math.round((totalSpend * 0.24) / Math.max(1, Math.floor(totalConversions * 0.35)) * 100) / 100,
        roas: 3.8, videoViews: 0,
      },
      {
        id: 'c4', name: 'Lead Gen — Interest Targeting', status: 'ACTIVE',
        spend: Math.round(totalSpend * 0.18 * 100) / 100,
        reach: Math.floor(totalReach * 0.15), impressions: Math.floor(totalImpressions * 0.16),
        clicks: Math.floor(totalClicks * 0.13), cpm: 17.8, ctr: 2.2,
        conversions: Math.floor(totalConversions * 0.13),
        cpa: Math.round((totalSpend * 0.18) / Math.max(1, Math.floor(totalConversions * 0.13)) * 100) / 100,
        roas: 2.9, videoViews: 0,
      },
    ],
    placements: [
      { platform: 'facebook', position: 'feed', spend: 0, impressions: 0, clicks: 0, conversions: 0 },
      { platform: 'instagram', position: 'stream', spend: 0, impressions: 0, clicks: 0, conversions: 0 },
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
