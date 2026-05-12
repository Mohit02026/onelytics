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
  selectedPlatforms?: string[]
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

// Maps checkbox platform IDs to their API route slugs
const PLATFORM_SLUG: Record<string, string> = {
  googleAds: 'ads',
  meta: 'meta',
  tiktok: 'tiktok',
  linkedin: 'linkedin',
  ga4: 'ga4',
  gsc: 'gsc',
  gbp: 'gbp',
  wordpress: 'wordpress',
}

export async function generateReport(
  workspaceId: string,
  startDate: string,
  endDate: string,
  title: string,
  baseUrl: string,
  authCookie: string,
  selectedPlatforms?: string[]
): Promise<ReportData> {
  const prev = prevRange(startDate, endDate)
  const reqHeaders = { Cookie: authCookie }

  // Which platforms to fetch (default: all)
  const sel = selectedPlatforms ?? Object.keys(PLATFORM_SLUG)
  const has = (id: string) => sel.includes(id)

  const qs = (s: string, e: string) => `?startDate=${s}&endDate=${e}`

  // Non-wordpress platforms fetched with date range (current + previous period)
  const dateRangePlatforms = ['ga4', 'googleAds', 'meta', 'tiktok', 'linkedin', 'gsc', 'gbp']
    .filter(has)
  const slugs = dateRangePlatforms.map((id) => PLATFORM_SLUG[id])

  const fetchOne = (slug: string, start: string, end: string) =>
    fetchWithTimeout(`${baseUrl}/api/analytics/${slug}${qs(start, end)}`, reqHeaders)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)

  const [currentResults, prevResults, wpResult] = await Promise.all([
    Promise.allSettled(slugs.map((s) => fetchOne(s, startDate, endDate))),
    Promise.allSettled(slugs.map((s) => fetchOne(s, prev.startDate, prev.endDate))),
    has('wordpress')
      ? fetchWithTimeout(`${baseUrl}/api/analytics/wordpress`, reqHeaders)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null),
  ])

  // Build lookup by platform ID
  const cur: Record<string, unknown> = {}
  const prv: Record<string, unknown> = {}
  dateRangePlatforms.forEach((id, i) => {
    cur[id] = currentResults[i].status === 'fulfilled' ? currentResults[i].value : null
    prv[id] = prevResults[i].status === 'fulfilled' ? prevResults[i].value : null
  })

  // Convenience aliases (null when not selected)
  const ga4 = (cur.ga4 ?? null) as Record<string, unknown> | null
  const ads = (cur.googleAds ?? null) as Record<string, unknown> | null
  const meta = (cur.meta ?? null) as Record<string, unknown> | null
  const tiktok = (cur.tiktok ?? null) as Record<string, unknown> | null
  const linkedin = (cur.linkedin ?? null) as Record<string, unknown> | null
  const gsc = (cur.gsc ?? null) as Record<string, unknown> | null
  const gbp = (cur.gbp ?? null) as Record<string, unknown> | null
  const wordpress = wpResult as Record<string, unknown> | null

  const pAds = (prv.googleAds ?? null) as Record<string, unknown> | null
  const pMeta = (prv.meta ?? null) as Record<string, unknown> | null
  const pTiktok = (prv.tiktok ?? null) as Record<string, unknown> | null
  const pLinkedin = (prv.linkedin ?? null) as Record<string, unknown> | null
  const pGa4 = (prv.ga4 ?? null) as Record<string, unknown> | null
  const pGsc = (prv.gsc ?? null) as Record<string, unknown> | null
  const pGbp = (prv.gbp ?? null) as Record<string, unknown> | null

  // Typed overview accessor helper
  const ov = (d: Record<string, unknown> | null) =>
    (d?.overview ?? {}) as Record<string, number>

  // Build channel metrics
  const channels: ChannelMetrics[] = []

  if (ads && ov(ads).spend !== undefined) {
    const o = ov(ads)
    channels.push({
      channel: 'Google Ads',
      color: '#4285f4',
      spend: o.spend ?? 0,
      impressions: o.impressions ?? 0,
      clicks: o.clicks ?? 0,
      ctr: o.ctr ?? 0,
      cpm: o.impressions > 0 ? ((o.spend ?? 0) / o.impressions) * 1000 : 0,
      conversions: o.conversions ?? 0,
      cpa: o.costPerConversion ?? 0,
      roas: o.roas ?? 0,
    })
  }

  if (meta && ov(meta).spend !== undefined) {
    const o = ov(meta)
    channels.push({
      channel: 'Meta Ads',
      color: '#e91e8c',
      spend: o.spend ?? 0,
      impressions: o.impressions ?? 0,
      clicks: o.clicks ?? 0,
      ctr: o.ctr ?? 0,
      cpm: o.cpm ?? 0,
      conversions: o.conversions ?? 0,
      cpa: o.conversions > 0 ? (o.spend / o.conversions) : 0,
    })
  }

  if (tiktok && ov(tiktok).spend !== undefined) {
    const o = ov(tiktok)
    channels.push({
      channel: 'TikTok Ads',
      color: '#14b8a6',
      spend: o.spend ?? 0,
      impressions: o.impressions ?? 0,
      clicks: o.clicks ?? 0,
      ctr: o.ctr ?? 0,
      cpm: o.cpm ?? 0,
      conversions: o.conversions ?? 0,
      cpa: o.cpa ?? 0,
    })
  }

  if (linkedin && ov(linkedin).spend !== undefined) {
    const o = ov(linkedin)
    channels.push({
      channel: 'LinkedIn Ads',
      color: '#0a66c2',
      spend: o.spend ?? 0,
      impressions: o.impressions ?? 0,
      clicks: o.clicks ?? 0,
      ctr: o.ctr ?? 0,
      cpm: o.cpm ?? 0,
      conversions: o.conversions ?? 0,
      cpa: o.costPerConversion ?? 0,
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
    googleAds: (ov(pAds).spend ?? 0),
    meta: (ov(pMeta).spend ?? 0),
    tiktok: (ov(pTiktok).spend ?? 0),
    linkedin: (ov(pLinkedin).spend ?? 0),
  }
  const prevTotalSpend = Object.values(prevChannels).reduce((s, v) => s + v, 0)
  const prevConversions =
    (ov(pAds).conversions ?? 0) +
    (ov(pMeta).conversions ?? 0) +
    (ov(pTiktok).conversions ?? 0) +
    (ov(pLinkedin).conversions ?? 0)
  const prevOrganicClicks = ov(pGa4).sessions ?? 0
  const organicClicks = ov(ga4).sessions ?? 0
  const organicKeywordClicks = ov(gsc).clicks ?? 0
  const prevOrganicKeywordClicks = ov(pGsc).clicks ?? 0
  const gbpViews = ov(gbp).totalViews ?? 0
  const prevGbpViews = ov(pGbp).totalViews ?? 0

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

  const adsDailyRows = (ads?.daily ?? []) as Array<Record<string, unknown>>
  const metaDailyRows = (meta?.daily ?? []) as Array<Record<string, unknown>>
  const tiktokDailyRows = (tiktok?.daily ?? []) as Array<Record<string, unknown>>
  const linkedinDailyRows = (linkedin?.daily ?? []) as Array<Record<string, unknown>>
  for (const row of adsDailyRows) addToDay(String(row.date ?? ''), 'google', Number(row.spend ?? 0))
  for (const row of metaDailyRows) addToDay(String(row.date ?? ''), 'meta', Number(row.spend ?? 0))
  for (const row of tiktokDailyRows) addToDay(String(row.date ?? ''), 'tiktok', Number(row.spend ?? 0))
  for (const row of linkedinDailyRows) addToDay(String(row.date ?? ''), 'linkedin', Number(row.spend ?? 0))

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
  // AI narrative is generated separately (non-blocking) — returns empty string here
  const aiNarrative = ''

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
    selectedPlatforms: sel,
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

export async function generateAINarrative(reportData: ReportData): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY || reportData.channels.length === 0) return ''
  try {
    const { channels, executiveSummary: es, momComparisons, dateRange } = reportData
    const client = new Anthropic()
    const prompt = `You are a senior digital marketing analyst writing a client report summary.

Period: ${dateRange.startDate} to ${dateRange.endDate}
Total Ad Spend: $${es.totalSpend.toFixed(2)}
Total Conversions: ${es.totalConversions}
Average CPA: $${es.avgCpa.toFixed(2)}
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
    return msg.content[0].type === 'text' ? msg.content[0].text : ''
  } catch {
    return ''
  }
}
