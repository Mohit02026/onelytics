import Anthropic from '@anthropic-ai/sdk'

export interface ChannelMetrics {
  channel: string
  color: string
  spend: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  conversions: number
  cpa: number
  roas?: number
}

export interface MoMMetric {
  label: string
  current: number
  previous: number
  delta: number // percentage change
  format: 'money' | 'number' | 'pct'
}

export interface ReportData {
  title: string
  dateRange: { startDate: string; endDate: string }
  prevDateRange: { startDate: string; endDate: string }
  executiveSummary: {
    totalSpend: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    avgCtr: number
    avgCpa: number
  }
  channels: ChannelMetrics[]
  dailySpend: { date: string; [channel: string]: string | number }[]
  momComparisons: MoMMetric[]
  aiNarrative: string
  generatedAt: string
  // Full platform data for detailed DOCX sections
  platforms?: {
    googleAds?: Record<string, unknown> | null
    meta?: Record<string, unknown> | null
    tiktok?: Record<string, unknown> | null
    linkedin?: Record<string, unknown> | null
    ga4?: Record<string, unknown> | null
    gsc?: Record<string, unknown> | null
    gbp?: Record<string, unknown> | null
    wordpress?: Record<string, unknown> | null
  }
}

function prevRange(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days + 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { startDate: fmt(prevStart), endDate: fmt(prevEnd) }
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

async function fetchWithTimeout(url: string, reqHeaders: Record<string, string> = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { headers: reqHeaders, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export async function generateReport(
  workspaceId: string,
  startDate: string,
  endDate: string,
  title: string,
  baseUrl: string,
  authCookie: string
): Promise<ReportData> {
  const prev = prevRange(startDate, endDate)
  const headers = { Cookie: authCookie }

  const paidPlatforms = ['ga4', 'ads', 'meta', 'tiktok', 'linkedin', 'gsc', 'gbp']
  const qs = (s: string, e: string) => `?startDate=${s}&endDate=${e}`

  // Fetch current + previous period for paid/organic platforms; wordpress current only
  const [currentResults, prevResults, wpResult] = await Promise.all([
    Promise.allSettled(
      paidPlatforms.map((p) =>
        fetchWithTimeout(`${baseUrl}/api/analytics/${p}${qs(startDate, endDate)}`, headers)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ),
    Promise.allSettled(
      paidPlatforms.map((p) =>
        fetchWithTimeout(`${baseUrl}/api/analytics/${p}${qs(prev.startDate, prev.endDate)}`, headers)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ),
    fetchWithTimeout(`${baseUrl}/api/analytics/wordpress`, headers)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ])

  const [ga4, ads, meta, tiktok, linkedin, gsc, gbp] = currentResults.map((r) =>
    r.status === 'fulfilled' ? r.value : null
  )
  const [pGa4, pAds, pMeta, pTiktok, pLinkedin, pGsc, pGbp] = prevResults.map((r) =>
    r.status === 'fulfilled' ? r.value : null
  )
  const wordpress = wpResult

  // Build channel metrics
  const channels: ChannelMetrics[] = []

  if (ads?.overview) {
    channels.push({
      channel: 'Google Ads',
      color: '#4285f4',
      spend: ads.overview.spend ?? 0,
      impressions: ads.overview.impressions ?? 0,
      clicks: ads.overview.clicks ?? 0,
      ctr: ads.overview.ctr ?? 0,
      cpm: ads.overview.impressions > 0 ? ((ads.overview.cost ?? 0) / ads.overview.impressions) * 1000 : 0,
      conversions: ads.overview.conversions ?? 0,
      cpa: ads.overview.costPerConversion ?? 0,
      roas: ads.overview.roas ?? 0,
    })
  }

  if (meta?.overview) {
    channels.push({
      channel: 'Meta Ads',
      color: '#e91e8c',
      spend: meta.overview.spend ?? 0,
      impressions: meta.overview.impressions ?? 0,
      clicks: meta.overview.clicks ?? 0,
      ctr: meta.overview.ctr ?? 0,
      cpm: meta.overview.cpm ?? 0,
      conversions: meta.overview.conversions ?? 0,
      cpa: meta.overview.conversions > 0 ? (meta.overview.spend / meta.overview.conversions) : 0,
    })
  }

  if (tiktok?.overview) {
    channels.push({
      channel: 'TikTok Ads',
      color: '#14b8a6',
      spend: tiktok.overview.spend ?? 0,
      impressions: tiktok.overview.impressions ?? 0,
      clicks: tiktok.overview.clicks ?? 0,
      ctr: tiktok.overview.ctr ?? 0,
      cpm: tiktok.overview.cpm ?? 0,
      conversions: tiktok.overview.conversions ?? 0,
      cpa: tiktok.overview.cpa ?? 0,
    })
  }

  if (linkedin?.overview) {
    channels.push({
      channel: 'LinkedIn Ads',
      color: '#0a66c2',
      spend: linkedin.overview.spend ?? 0,
      impressions: linkedin.overview.impressions ?? 0,
      clicks: linkedin.overview.clicks ?? 0,
      ctr: linkedin.overview.ctr ?? 0,
      cpm: linkedin.overview.cpm ?? 0,
      conversions: linkedin.overview.conversions ?? 0,
      cpa: linkedin.overview.costPerConversion ?? 0,
    })
  }

  // Executive summary totals
  const totalSpend = channels.reduce((s, c) => s + c.spend, 0)
  const totalImpressions = channels.reduce((s, c) => s + c.impressions, 0)
  const totalClicks = channels.reduce((s, c) => s + c.clicks, 0)
  const totalConversions = channels.reduce((s, c) => s + c.conversions, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0

  // Previous period totals for MoM
  const prevChannels = {
    googleAds: pAds?.overview?.spend ?? 0,
    meta: pMeta?.overview?.spend ?? 0,
    tiktok: pTiktok?.overview?.spend ?? 0,
    linkedin: pLinkedin?.overview?.spend ?? 0,
  }
  const prevTotalSpend = Object.values(prevChannels).reduce((s, v) => s + v, 0)
  const prevConversions =
    (pAds?.overview?.conversions ?? 0) +
    (pMeta?.overview?.conversions ?? 0) +
    (pTiktok?.overview?.conversions ?? 0) +
    (pLinkedin?.overview?.conversions ?? 0)
  const prevOrganicClicks = pGa4?.overview?.sessions ?? 0
  const organicClicks = ga4?.overview?.sessions ?? 0
  const organicKeywordClicks = gsc?.overview?.clicks ?? 0
  const prevOrganicKeywordClicks = pGsc?.overview?.clicks ?? 0
  const gbpViews = gbp?.overview?.totalViews ?? 0
  const prevGbpViews = pGbp?.overview?.totalViews ?? 0

  const momComparisons: MoMMetric[] = [
    {
      label: 'Total Ad Spend',
      current: totalSpend,
      previous: prevTotalSpend,
      delta: pctDelta(totalSpend, prevTotalSpend),
      format: 'money',
    },
    {
      label: 'Total Conversions',
      current: totalConversions,
      previous: prevConversions,
      delta: pctDelta(totalConversions, prevConversions),
      format: 'number',
    },
    {
      label: 'Organic Sessions',
      current: organicClicks,
      previous: prevOrganicClicks,
      delta: pctDelta(organicClicks, prevOrganicClicks),
      format: 'number',
    },
    {
      label: 'Organic Clicks (GSC)',
      current: organicKeywordClicks,
      previous: prevOrganicKeywordClicks,
      delta: pctDelta(organicKeywordClicks, prevOrganicKeywordClicks),
      format: 'number',
    },
    {
      label: 'Local Profile Views',
      current: gbpViews,
      previous: prevGbpViews,
      delta: pctDelta(gbpViews, prevGbpViews),
      format: 'number',
    },
  ]

  // Build daily spend combining all channels
  const dailyMap = new Map<string, { google: number; meta: number; tiktok: number; linkedin: number }>()
  function addToDay(date: string, channel: string, spend: number) {
    if (!dailyMap.has(date)) dailyMap.set(date, { google: 0, meta: 0, tiktok: 0, linkedin: 0 })
    const day = dailyMap.get(date)!
    if (channel === 'google') day.google += spend
    if (channel === 'meta') day.meta += spend
    if (channel === 'tiktok') day.tiktok += spend
    if (channel === 'linkedin') day.linkedin += spend
  }

  for (const row of ads?.daily ?? []) addToDay(row.date, 'google', row.spend ?? 0)
  for (const row of meta?.daily ?? []) addToDay(row.date, 'meta', row.spend ?? 0)
  for (const row of tiktok?.daily ?? []) addToDay(row.date, 'tiktok', row.spend ?? 0)
  for (const row of linkedin?.daily ?? []) addToDay(row.date, 'linkedin', row.spend ?? 0)

  const dailySpend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      google: Math.round(v.google * 100) / 100,
      meta: Math.round(v.meta * 100) / 100,
      tiktok: Math.round(v.tiktok * 100) / 100,
      linkedin: Math.round(v.linkedin * 100) / 100,
    }))

  // AI narrative
  let aiNarrative = ''
  if (process.env.ANTHROPIC_API_KEY && channels.length > 0) {
    try {
      const client = new Anthropic()
      const prompt = `You are a senior digital marketing analyst writing a client report summary.

Period: ${startDate} to ${endDate}
Total Ad Spend: $${totalSpend.toFixed(2)}
Total Conversions: ${totalConversions}
Average CPA: $${avgCpa.toFixed(2)}
Channels active: ${channels.map((c) => c.channel).join(', ')}

Channel breakdown:
${channels.map((c) => `- ${c.channel}: $${c.spend.toFixed(2)} spend, ${c.impressions.toLocaleString()} impressions, ${c.conversions} conversions`).join('\n')}

MoM changes:
${momComparisons.map((m) => `- ${m.label}: ${m.delta > 0 ? '+' : ''}${m.delta}%`).join('\n')}

Write a 3-4 sentence executive summary for the client. Be specific about the numbers. Then give 3 bullet points with the top insights or recommendations. Keep it professional and concise.`

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      })
      aiNarrative = msg.content[0].type === 'text' ? msg.content[0].text : ''
    } catch {
      aiNarrative = ''
    }
  }

  return {
    title,
    dateRange: { startDate, endDate },
    prevDateRange: prev,
    executiveSummary: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCtr: Math.round(avgCtr * 100) / 100,
      avgCpa: Math.round(avgCpa * 100) / 100,
    },
    channels,
    dailySpend,
    momComparisons,
    aiNarrative,
    generatedAt: new Date().toISOString(),
    platforms: {
      googleAds: ads,
      meta,
      tiktok,
      linkedin,
      ga4,
      gsc,
      gbp,
      wordpress,
    },
  }
}
