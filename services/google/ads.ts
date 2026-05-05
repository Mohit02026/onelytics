export interface AdsOverview {
  spend: number // USD
  clicks: number
  impressions: number
  cpc: number // cost per click
  roas: number // return on ad spend
}

export interface AdsDailyRow {
  date: string // "YYYY-MM-DD"
  spend: number
  clicks: number
  impressions: number
}

export interface AdsCampaign {
  name: string
  spend: number
  clicks: number
  impressions: number
  cpc: number
  roas: number
}

export interface AdsReport {
  overview: AdsOverview
  daily: AdsDailyRow[]
  campaigns: AdsCampaign[]
  dateRange: { startDate: string; endDate: string }
  source?: 'google-ads' | 'ga4'
}

// ─── Real Google Ads API ──────────────────────────────────────────────────────
// Google Ads uses GAQL (Google Ads Query Language) via REST.
// Requires: access_token + developer_token + customer_id header.

export async function getAdsReportFromApi(
  accessToken: string,
  customerId: string, // Google Ads customer ID (without dashes)
  startDate: string,
  endDate: string
): Promise<AdsReport> {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!
  const baseUrl = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': devToken,
    'Content-Type': 'application/json',
  }

  // Daily performance query
  const dailyQuery = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date ASC
  `

  // Campaign-level query
  const campaignQuery = `
    SELECT
      campaign.name,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 10
  `

  const [dailyRes, campaignRes] = await Promise.all([
    fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ query: dailyQuery }) }),
    fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ query: campaignQuery }) }),
  ])

  if (!dailyRes.ok) {
    const errText = await dailyRes.text().catch(() => '')
    throw new Error(`Google Ads API error ${dailyRes.status}: ${errText.slice(0, 500)}`)
  }

  const dailyStream: { results: { segments: { date: string }; metrics: { cost_micros: string; clicks: string; impressions: string } }[] }[] = await dailyRes.json()
  const campaignStream: { results: { campaign: { name: string }; metrics: { cost_micros: string; clicks: string; impressions: string; conversions_value: string } }[] }[] = await campaignRes.ok ? await campaignRes.json() : [{ results: [] }]

  // Aggregate daily rows (searchStream returns an array of chunks)
  const dailyMap = new Map<string, AdsDailyRow>()
  for (const chunk of dailyStream) {
    for (const row of chunk.results ?? []) {
      const date = row.segments.date
      const existing = dailyMap.get(date) ?? { date, spend: 0, clicks: 0, impressions: 0 }
      existing.spend += parseInt(row.metrics.cost_micros, 10) / 1_000_000
      existing.clicks += parseInt(row.metrics.clicks, 10)
      existing.impressions += parseInt(row.metrics.impressions, 10)
      dailyMap.set(date, existing)
    }
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  const overview: AdsOverview = daily.reduce(
    (acc, d) => ({
      spend: acc.spend + d.spend,
      clicks: acc.clicks + d.clicks,
      impressions: acc.impressions + d.impressions,
      cpc: 0,
      roas: 0,
    }),
    { spend: 0, clicks: 0, impressions: 0, cpc: 0, roas: 0 }
  )
  overview.cpc = overview.clicks > 0 ? overview.spend / overview.clicks : 0
  overview.roas = overview.spend > 0 ? overview.spend * 4.2 : 0 // placeholder until conversions wired

  const campaigns: AdsCampaign[] = []
  for (const chunk of campaignStream) {
    for (const row of chunk.results ?? []) {
      const spend = parseInt(row.metrics.cost_micros, 10) / 1_000_000
      const clicks = parseInt(row.metrics.clicks, 10)
      const impressions = parseInt(row.metrics.impressions, 10)
      const convValue = parseFloat(row.metrics.conversions_value ?? '0')
      campaigns.push({
        name: row.campaign.name,
        spend,
        clicks,
        impressions,
        cpc: clicks > 0 ? spend / clicks : 0,
        roas: spend > 0 ? convValue / spend : 0,
      })
    }
  }

  return { overview, daily, campaigns, dateRange: { startDate, endDate } }
}

// ─── GA4-based fallback (uses linked Google Ads data via GA4 Data API) ───────
// When the Google Ads developer token isn't approved yet, GA4 already imports
// cost/click/impression data from linked Ads accounts automatically.

type Ga4ReportRow = {
  dimensionValues: { value: string }[]
  metricValues: { value: string }[]
}

type Ga4ReportResponse = {
  rows?: Ga4ReportRow[]
}

export async function getAdsReportFromGA4(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<AdsReport> {
  const base = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  const dateRanges = [{ startDate, endDate }]
  const adMetrics = [
    { name: 'advertiserAdCost' },
    { name: 'advertiserAdClicks' },
    { name: 'advertiserAdImpressions' },
    { name: 'conversions' },
    { name: 'purchaseRevenue' },
  ]

  const [dailyRes, campaignRes] = await Promise.all([
    fetch(`${base}:runReport`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: adMetrics,
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    }),
    fetch(`${base}:runReport`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dateRanges,
        dimensions: [{ name: 'sessionCampaignName' }],
        metrics: adMetrics,
        orderBys: [{ metric: { metricName: 'advertiserAdCost' }, desc: true }],
        limit: 20,
      }),
    }),
  ])

  if (!dailyRes.ok) {
    const err = await dailyRes.json().catch(() => ({}))
    throw new Error(`GA4 Ads fallback error: ${(err as { error?: { message?: string } }).error?.message ?? dailyRes.status}`)
  }

  const dailyData: Ga4ReportResponse = await dailyRes.json()
  const campaignData: Ga4ReportResponse = campaignRes.ok ? await campaignRes.json() : { rows: [] }

  // GA4 date format is YYYYMMDD → convert to YYYY-MM-DD
  const fmtDate = (v: string) => `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`

  const daily: AdsDailyRow[] = (dailyData.rows ?? []).map((row) => ({
    date: fmtDate(row.dimensionValues[0].value),
    spend: parseFloat(row.metricValues[0].value ?? '0'),
    clicks: parseInt(row.metricValues[1].value ?? '0', 10),
    impressions: parseInt(row.metricValues[2].value ?? '0', 10),
  }))

  const overviewAcc = { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 }
  for (const d of daily) {
    overviewAcc.spend += d.spend
    overviewAcc.clicks += d.clicks
    overviewAcc.impressions += d.impressions
  }
  // Sum conversions + revenue from daily rows directly
  for (const row of dailyData.rows ?? []) {
    overviewAcc.conversions += parseFloat(row.metricValues[3].value ?? '0')
    overviewAcc.revenue += parseFloat(row.metricValues[4].value ?? '0')
  }

  const campaigns: AdsCampaign[] = (campaignData.rows ?? [])
    .filter((row) => {
      const name = row.dimensionValues[0].value
      return name !== '(not set)' && name !== '(other)' && parseFloat(row.metricValues[0].value) > 0
    })
    .map((row) => {
      const spend = parseFloat(row.metricValues[0].value ?? '0')
      const clicks = parseInt(row.metricValues[1].value ?? '0', 10)
      const impressions = parseInt(row.metricValues[2].value ?? '0', 10)
      const revenue = parseFloat(row.metricValues[4].value ?? '0')
      return {
        name: row.dimensionValues[0].value,
        spend: Math.round(spend * 100) / 100,
        clicks,
        impressions,
        cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
        roas: spend > 0 && revenue > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      }
    })

  const { spend, clicks, impressions } = overviewAcc
  return {
    overview: {
      spend: Math.round(spend * 100) / 100,
      clicks,
      impressions,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      roas: spend > 0 && overviewAcc.revenue > 0
        ? Math.round((overviewAcc.revenue / spend) * 100) / 100
        : 0,
    },
    daily,
    campaigns,
    dateRange: { startDate, endDate },
    source: 'ga4',
  }
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

function seeded(n: number) {
  const x = Math.sin(n + 7) * 10000
  return x - Math.floor(x)
}

export function getAdsReportDummy(startDate: string, endDate: string): AdsReport {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daily: AdsDailyRow[] = []
  let totalSpend = 0
  let totalClicks = 0
  let totalImpressions = 0

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const seed = d.getTime() / 1_000_000
    const spend = Math.round((40 + seeded(seed) * 80) * 100) / 100
    const clicks = Math.floor(80 + seeded(seed + 1) * 120)
    const impressions = Math.floor(clicks * (8 + seeded(seed + 2) * 6))
    daily.push({ date: d.toISOString().split('T')[0], spend, clicks, impressions })
    totalSpend += spend
    totalClicks += clicks
    totalImpressions += impressions
  }

  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
  const roas = 4.2

  return {
    overview: {
      spend: Math.round(totalSpend * 100) / 100,
      clicks: totalClicks,
      impressions: totalImpressions,
      cpc: Math.round(cpc * 100) / 100,
      roas,
    },
    daily,
    campaigns: [
      { name: 'Brand Keywords', spend: Math.round(totalSpend * 0.38 * 100) / 100, clicks: Math.floor(totalClicks * 0.38), impressions: Math.floor(totalImpressions * 0.3), cpc: 0.58, roas: 6.1 },
      { name: 'Competitor Targeting', spend: Math.round(totalSpend * 0.27 * 100) / 100, clicks: Math.floor(totalClicks * 0.27), impressions: Math.floor(totalImpressions * 0.25), cpc: 1.24, roas: 3.8 },
      { name: 'Generic Search', spend: Math.round(totalSpend * 0.22 * 100) / 100, clicks: Math.floor(totalClicks * 0.22), impressions: Math.floor(totalImpressions * 0.3), cpc: 1.85, roas: 2.9 },
      { name: 'Display Remarketing', spend: Math.round(totalSpend * 0.13 * 100) / 100, clicks: Math.floor(totalClicks * 0.13), impressions: Math.floor(totalImpressions * 0.15), cpc: 0.62, roas: 5.2 },
    ],
    dateRange: { startDate, endDate },
  }
}

export const DUMMY_TOKEN = 'dummy_access_token'

export async function getAdsReport(
  accessToken: string,
  customerId: string,
  startDate: string,
  endDate: string
): Promise<AdsReport> {
  if (accessToken === DUMMY_TOKEN) return getAdsReportDummy(startDate, endDate)
  return getAdsReportFromApi(accessToken, customerId, startDate, endDate)
}
