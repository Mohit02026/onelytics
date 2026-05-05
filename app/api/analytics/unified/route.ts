import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export interface UnifiedReport {
  dateRange: { startDate: string; endDate: string }
  connected: { google: boolean; meta: boolean; wordpress: boolean; gsc: boolean }
  totalAdSpend: number
  googleAdSpend: number
  metaAdSpend: number
  tiktokAdSpend: number
  linkedinAdSpend: number
  totalImpressions: number
  totalClicks: number
  organicClicks: number
  sessions: number
  avgPosition: number
  totalConversions: number
  googleRoas: number
  spendByChannel: { channel: string; spend: number; color: string }[]
  dailySpend: { date: string; google: number; meta: number; tiktok: number; linkedin: number }[]
}

async function fetchJson(url: string, cookie: string): Promise<Record<string, unknown> | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(url, { headers: { Cookie: cookie }, signal: controller.signal })
    clearTimeout(timeout)
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function overview(data: any, key: string): number {
  return data?.overview?.[key] ?? 0
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = schema.safeParse({
    startDate: searchParams.get('startDate'),
    endDate: searchParams.get('endDate'),
  })
  if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 })

  const workspaceId = session.user.workspaceId
  const { startDate, endDate } = parsed.data

  const accounts = await prisma.connectedAccount.findMany({ where: { workspaceId } })
  const googleAccount = accounts.find((a) => a.provider === 'google')
  const metaAccount = accounts.find((a) => a.provider === 'meta')
  const wpAccount = accounts.find((a) => a.provider === 'wordpress')
  const gscMeta = googleAccount?.metadata as Record<string, string> | null
  const hasGsc = !!gscMeta?.gscSiteUrl

  const reqUrl = new URL(req.url)
  const baseUrl = `${reqUrl.protocol}//${reqUrl.host}`
  const cookie = req.headers.get('cookie') ?? ''
  const qs = `?startDate=${startDate}&endDate=${endDate}`

  const [ads, meta, ga4, gsc, tiktok, linkedin] = await Promise.all([
    fetchJson(`${baseUrl}/api/analytics/ads${qs}`, cookie),
    fetchJson(`${baseUrl}/api/analytics/meta${qs}`, cookie),
    fetchJson(`${baseUrl}/api/analytics/ga4${qs}`, cookie),
    fetchJson(`${baseUrl}/api/analytics/gsc${qs}`, cookie),
    fetchJson(`${baseUrl}/api/analytics/tiktok${qs}`, cookie),
    fetchJson(`${baseUrl}/api/analytics/linkedin${qs}`, cookie),
  ])

  const googleAdSpend = overview(ads, 'spend')
  const metaAdSpend = overview(meta, 'spend')
  const tiktokAdSpend = overview(tiktok, 'spend')
  const linkedinAdSpend = overview(linkedin, 'spend')
  const totalAdSpend = googleAdSpend + metaAdSpend + tiktokAdSpend + linkedinAdSpend

  const dailyMap = new Map<string, { google: number; meta: number; tiktok: number; linkedin: number }>()
  function addToDay(date: string, channel: 'google' | 'meta' | 'tiktok' | 'linkedin', spend: number) {
    if (!dailyMap.has(date)) dailyMap.set(date, { google: 0, meta: 0, tiktok: 0, linkedin: 0 })
    dailyMap.get(date)![channel] += spend
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (ads as any)?.daily ?? []) addToDay(row.date, 'google', row.spend ?? 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (meta as any)?.daily ?? []) addToDay(row.date, 'meta', row.spend ?? 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (tiktok as any)?.daily ?? []) addToDay(row.date, 'tiktok', row.spend ?? 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (linkedin as any)?.daily ?? []) addToDay(row.date, 'linkedin', row.spend ?? 0)

  const dailySpend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  const spendByChannel: { channel: string; spend: number; color: string }[] = []
  if (googleAdSpend > 0) spendByChannel.push({ channel: 'Google Ads', spend: googleAdSpend, color: '#3b82f6' })
  if (metaAdSpend > 0) spendByChannel.push({ channel: 'Meta Ads', spend: metaAdSpend, color: '#ec4899' })
  if (tiktokAdSpend > 0) spendByChannel.push({ channel: 'TikTok Ads', spend: tiktokAdSpend, color: '#14b8a6' })
  if (linkedinAdSpend > 0) spendByChannel.push({ channel: 'LinkedIn Ads', spend: linkedinAdSpend, color: '#0a66c2' })

  const report: UnifiedReport = {
    dateRange: { startDate, endDate },
    connected: {
      google: !!googleAccount,
      meta: !!metaAccount,
      wordpress: !!wpAccount,
      gsc: hasGsc,
    },
    totalAdSpend: Math.round(totalAdSpend * 100) / 100,
    googleAdSpend: Math.round(googleAdSpend * 100) / 100,
    metaAdSpend: Math.round(metaAdSpend * 100) / 100,
    tiktokAdSpend: Math.round(tiktokAdSpend * 100) / 100,
    linkedinAdSpend: Math.round(linkedinAdSpend * 100) / 100,
    totalImpressions:
      overview(ads, 'impressions') +
      overview(meta, 'impressions') +
      overview(tiktok, 'impressions') +
      overview(linkedin, 'impressions'),
    totalClicks:
      overview(ads, 'clicks') +
      overview(meta, 'clicks') +
      overview(tiktok, 'clicks') +
      overview(linkedin, 'clicks'),
    organicClicks: overview(gsc, 'clicks'),
    sessions: overview(ga4, 'sessions'),
    avgPosition: overview(gsc, 'position'),
    totalConversions:
      overview(ads, 'conversions') +
      overview(meta, 'conversions') +
      overview(tiktok, 'conversions') +
      overview(linkedin, 'conversions'),
    googleRoas: overview(ads, 'roas'),
    spendByChannel,
    dailySpend,
  }

  return Response.json(report)
}
