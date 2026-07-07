// Headless equivalents of the app/api/analytics/* routes' data-fetching logic.
// Those routes authenticate via the caller's session cookie and derive workspaceId
// from it — there's no session in a scheduled job, so these take workspaceId
// directly and duplicate the same connect/cache/fetch steps, minus the auth check.
// Each returns null when the platform isn't connected for that workspace.

import { prisma } from '@/lib/db'
import { decrypt, encrypt } from '@/lib/encryption'
import { getGa4Report } from '@/services/google/ga4'
import { getAdsReport, getAdsReportFromGA4, DUMMY_TOKEN } from '@/services/google/ads'
import { resolveGoogleToken, refreshAccessToken } from '@/services/google/auth'
import { getMetaReport } from '@/services/meta/ads'
import { getGscReport } from '@/services/google/gsc'
import { getTikTokReport } from '@/services/tiktok/ads'
import { refreshAccessToken as refreshTikTokToken } from '@/services/tiktok/auth'
import { getLinkedInReport } from '@/services/linkedin/ads'
import { getGbpReportFromApi, getGbpReportDummy } from '@/services/google/gbp'
import { getWpReport } from '@/services/wordpress'

type Report = Record<string, unknown> | null

async function getCached(workspaceId: string, provider: string, dateRange: string): Promise<Report> {
  const cached = await prisma.analyticsCache.findUnique({
    where: { workspaceId_provider_dataType_dateRange: { workspaceId, provider, dataType: 'report', dateRange } },
  })
  if (cached && Date.now() - cached.fetchedAt.getTime() < 6 * 60 * 60 * 1000) {
    return cached.data as Report
  }
  return undefined as unknown as Report // sentinel: not cached (distinct from a genuine null report)
}

async function setCache(workspaceId: string, provider: string, dateRange: string, data: object) {
  await prisma.analyticsCache.upsert({
    where: { workspaceId_provider_dataType_dateRange: { workspaceId, provider, dataType: 'report', dateRange } },
    update: { data, fetchedAt: new Date() },
    create: { workspaceId, provider, dataType: 'report', dateRange, data },
  })
}

export async function fetchGa4(workspaceId: string, startDate: string, endDate: string): Promise<Report> {
  const account = await prisma.connectedAccount.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'google' } } })
  if (!account) return null

  const dateRange = `${startDate}:${endDate}`
  const cached = await getCached(workspaceId, 'ga4', dateRange)
  if (cached !== undefined) return cached

  const accessToken = await resolveGoogleToken(workspaceId, account)
  const report = await getGa4Report(accessToken, account.propertyId ?? '', startDate, endDate)
  await setCache(workspaceId, 'ga4', dateRange, report as object)
  return report as unknown as Report
}

export async function fetchAds(workspaceId: string, startDate: string, endDate: string): Promise<Report> {
  const account = await prisma.connectedAccount.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'google' } } })
  if (!account) return null

  const meta = account.metadata as Record<string, string> | null
  const customerId = meta?.googleAdsCustomerId ?? ''
  const propertyId = account.propertyId ?? ''

  const dateRange = `${startDate}:${endDate}`
  const cached = await getCached(workspaceId, 'google-ads', dateRange)
  if (cached !== undefined) return cached

  const decrypted = decrypt(account.accessToken)
  let accessToken = decrypted
  if (decrypted !== DUMMY_TOKEN) {
    const expiresAt = account.expiresAt?.getTime() ?? 0
    if (Date.now() >= expiresAt - 5 * 60 * 1000 && account.refreshToken) {
      const refreshed = await refreshAccessToken(decrypt(account.refreshToken))
      accessToken = refreshed.accessToken
      await prisma.connectedAccount.update({
        where: { workspaceId_provider: { workspaceId, provider: 'google' } },
        data: { accessToken: encrypt(accessToken), expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000) },
      })
    }
  }

  let report
  if (customerId && accessToken !== DUMMY_TOKEN) {
    try {
      report = await getAdsReport(accessToken, customerId, startDate, endDate)
    } catch {
      // fall through to GA4 fallback
    }
  }
  if (!report) {
    if (!propertyId) return null
    report = await getAdsReportFromGA4(accessToken, propertyId, startDate, endDate)
  }

  await setCache(workspaceId, 'google-ads', dateRange, report as object)
  return report as unknown as Report
}

export async function fetchMeta(workspaceId: string, startDate: string, endDate: string): Promise<Report> {
  const account = await prisma.connectedAccount.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'meta' } } })
  if (!account) return null

  const dateRange = `${startDate}:${endDate}`
  const cached = await getCached(workspaceId, 'meta', dateRange)
  if (cached !== undefined) return cached

  const accessToken = decrypt(account.accessToken)
  const report = await getMetaReport(accessToken, account.propertyId ?? '', startDate, endDate)
  await setCache(workspaceId, 'meta', dateRange, report as object)
  return report as unknown as Report
}

export async function fetchGsc(workspaceId: string, startDate: string, endDate: string): Promise<Report> {
  const account = await prisma.connectedAccount.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'google' } } })
  if (!account) return null

  const meta = account.metadata as Record<string, string> | null
  const siteUrl = meta?.gscSiteUrl ?? ''

  const dateRange = `${startDate}:${endDate}:none:none`
  const cached = await getCached(workspaceId, 'gsc', dateRange)
  if (cached !== undefined) return cached

  const accessToken = await resolveGoogleToken(workspaceId, account)
  const report = await getGscReport(accessToken, siteUrl, startDate, endDate)
  await setCache(workspaceId, 'gsc', dateRange, report as object)
  return report as unknown as Report
}

export async function fetchTikTok(workspaceId: string, startDate: string, endDate: string): Promise<Report> {
  const account = await prisma.connectedAccount.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } } })
  if (!account) return null

  const dateRange = `${startDate}:${endDate}`
  const cached = await getCached(workspaceId, 'tiktok', dateRange)
  if (cached !== undefined) return cached

  let accessToken = decrypt(account.accessToken)
  if (account.refreshToken && account.expiresAt && account.expiresAt.getTime() - Date.now() < 3600 * 1000) {
    try {
      const refreshed = await refreshTikTokToken(decrypt(account.refreshToken))
      await prisma.connectedAccount.update({
        where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } },
        data: {
          accessToken: encrypt(refreshed.accessToken),
          refreshToken: encrypt(refreshed.refreshToken),
          expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
        },
      })
      accessToken = refreshed.accessToken
    } catch {
      // proceed with existing token
    }
  }

  const report = await getTikTokReport(accessToken, account.propertyId ?? '', startDate, endDate)
  await setCache(workspaceId, 'tiktok', dateRange, report as object)
  return report as unknown as Report
}

export async function fetchLinkedIn(workspaceId: string, startDate: string, endDate: string): Promise<Report> {
  const account = await prisma.connectedAccount.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'linkedin' } } })
  if (!account) return null

  const dateRange = `${startDate}:${endDate}`
  const cached = await getCached(workspaceId, 'linkedin', dateRange)
  if (cached !== undefined) return cached

  const accessToken = decrypt(account.accessToken)
  const accountId = account.propertyId ? `urn:li:sponsoredAccount:${account.propertyId}` : ''
  const report = await getLinkedInReport(accessToken, accountId, startDate, endDate)
  await setCache(workspaceId, 'linkedin', dateRange, report as object)
  return report as unknown as Report
}

export async function fetchGbp(workspaceId: string, startDate: string, endDate: string): Promise<Report> {
  const account = await prisma.connectedAccount.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'google' } } })
  if (!account) return null

  const meta = account.metadata as Record<string, string> | null
  const locationName = meta?.gbpLocationId ?? ''

  const dateRange = `${startDate}:${endDate}`
  const cached = await getCached(workspaceId, 'gbp', dateRange)
  if (cached !== undefined) return cached

  const accessToken = await resolveGoogleToken(workspaceId, account)
  const report = accessToken === DUMMY_TOKEN || !locationName
    ? await getGbpReportDummy(startDate, endDate)
    : await getGbpReportFromApi(locationName, accessToken, startDate, endDate)

  await setCache(workspaceId, 'gbp', dateRange, report as object)
  return report as unknown as Report
}

export async function fetchWordPress(workspaceId: string, startDate: string, endDate: string): Promise<Report> {
  const account = await prisma.connectedAccount.findUnique({ where: { workspaceId_provider: { workspaceId, provider: 'wordpress' } } })
  if (!account) return null

  const dateRange = `${startDate}:${endDate}`
  const cached = await getCached(workspaceId, 'wordpress', dateRange)
  if (cached !== undefined) return cached

  const report = await getWpReport(account.propertyId ?? '', decrypt(account.accessToken), startDate, endDate)
  await setCache(workspaceId, 'wordpress', dateRange, report as object)
  return report as unknown as Report
}
