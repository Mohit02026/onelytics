import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { refreshAccessToken } from '@/services/google/auth'
import { encrypt } from '@/lib/encryption'
import { getGa4ReportDummy, getGa4ReportFromApi } from '@/services/google/ga4'
import { getAdsReportDummy, getAdsReportFromApi } from '@/services/google/ads'
import { getGscReportDummy, getGscReportFromApi } from '@/services/google/gsc'
import { getMetaReportDummy, getMetaReportFromApi } from '@/services/meta/ads'
import { z } from 'zod'

const DUMMY_GOOGLE = 'dummy_access_token'
const DUMMY_META = 'dummy_meta_token'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

async function resolveGoogleToken(
  workspaceId: string,
  account: { accessToken: string; refreshToken: string | null; expiresAt: Date | null }
): Promise<string> {
  const decrypted = decrypt(account.accessToken)
  if (decrypted === DUMMY_GOOGLE) return DUMMY_GOOGLE
  const expiresAt = account.expiresAt?.getTime() ?? 0
  if (Date.now() < expiresAt - 5 * 60 * 1000) return decrypted
  if (!account.refreshToken) throw new Error('No refresh token')
  const refreshed = await refreshAccessToken(decrypt(account.refreshToken))
  await prisma.connectedAccount.update({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    data: { accessToken: encrypt(refreshed.accessToken), expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000) },
  })
  return refreshed.accessToken
}

export interface UnifiedReport {
  dateRange: { startDate: string; endDate: string }
  connected: { google: boolean; meta: boolean; wordpress: boolean; gsc: boolean }
  totalAdSpend: number
  googleAdSpend: number
  metaAdSpend: number
  totalImpressions: number
  totalClicks: number
  organicClicks: number
  sessions: number
  avgPosition: number
  spendByChannel: { channel: string; spend: number; color: string }[]
  dailySpend: { date: string; google: number; meta: number }[]
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

  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId },
  })

  const googleAccount = accounts.find((a) => a.provider === 'google')
  const metaAccount = accounts.find((a) => a.provider === 'meta')
  const wpAccount = accounts.find((a) => a.provider === 'wordpress')

  const gscMeta = googleAccount?.metadata as Record<string, string> | null
  const hasGsc = !!gscMeta?.gscSiteUrl
  const googleAdsCustomerId = gscMeta?.googleAdsCustomerId ?? ''

  // Fetch all sources in parallel (gracefully handle missing connections)
  const [adsResult, metaResult, ga4Result, gscResult] = await Promise.allSettled([
    googleAccount && googleAdsCustomerId
      ? resolveGoogleToken(workspaceId, googleAccount).then((token) =>
          token === DUMMY_GOOGLE
            ? getAdsReportDummy(startDate, endDate)
            : getAdsReportFromApi(token, googleAdsCustomerId, startDate, endDate)
        )
      : Promise.reject('not connected'),
    metaAccount
      ? (async () => {
          const token = decrypt(metaAccount.accessToken)
          return token === DUMMY_META
            ? getMetaReportDummy(startDate, endDate)
            : getMetaReportFromApi(token, metaAccount.propertyId ?? '', startDate, endDate)
        })()
      : Promise.reject('not connected'),
    googleAccount
      ? resolveGoogleToken(workspaceId, googleAccount).then((token) =>
          token === DUMMY_GOOGLE
            ? getGa4ReportDummy(startDate, endDate)
            : getGa4ReportFromApi(token, googleAccount.propertyId ?? '', startDate, endDate)
        )
      : Promise.reject('not connected'),
    googleAccount && hasGsc
      ? resolveGoogleToken(workspaceId, googleAccount).then((token) =>
          token === DUMMY_GOOGLE
            ? getGscReportDummy(startDate, endDate)
            : getGscReportFromApi(token, gscMeta!.gscSiteUrl, startDate, endDate)
        )
      : Promise.reject('not connected'),
  ])

  const ads = adsResult.status === 'fulfilled' ? adsResult.value : null
  const meta = metaResult.status === 'fulfilled' ? metaResult.value : null
  const ga4 = ga4Result.status === 'fulfilled' ? ga4Result.value : null
  const gsc = gscResult.status === 'fulfilled' ? gscResult.value : null

  const googleAdSpend = ads?.overview.spend ?? 0
  const metaAdSpend = meta?.overview.spend ?? 0
  const totalAdSpend = googleAdSpend + metaAdSpend

  // Merge daily spend
  const dailyMap = new Map<string, { google: number; meta: number }>()
  for (const row of ads?.daily ?? []) {
    dailyMap.set(row.date, { google: row.spend, meta: 0 })
  }
  for (const row of meta?.daily ?? []) {
    const existing = dailyMap.get(row.date) ?? { google: 0, meta: 0 }
    dailyMap.set(row.date, { ...existing, meta: row.spend })
  }
  const dailySpend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }))

  const spendByChannel: { channel: string; spend: number; color: string }[] = []
  if (googleAdSpend > 0) spendByChannel.push({ channel: 'Google Ads', spend: googleAdSpend, color: '#3b82f6' })
  if (metaAdSpend > 0) spendByChannel.push({ channel: 'Meta Ads', spend: metaAdSpend, color: '#ec4899' })

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
    totalImpressions: (ads?.overview.impressions ?? 0) + (meta?.overview.impressions ?? 0),
    totalClicks: (ads?.overview.clicks ?? 0) + (meta?.overview.clicks ?? 0),
    organicClicks: gsc?.overview.clicks ?? 0,
    sessions: ga4?.overview.sessions ?? 0,
    avgPosition: gsc?.overview.position ?? 0,
    spendByChannel,
    dailySpend,
  }

  return Response.json(report)
}
