import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'
import { getAdsReport, getAdsReportFromGA4, DUMMY_TOKEN } from '@/services/google/ads'
import { refreshAccessToken } from '@/services/google/auth'
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

async function resolveAccessToken(
  workspaceId: string,
  account: { accessToken: string; refreshToken: string | null; expiresAt: Date | null }
): Promise<string> {
  const decrypted = decrypt(account.accessToken)
  if (decrypted === DUMMY_TOKEN) return DUMMY_TOKEN

  const expiresAt = account.expiresAt?.getTime() ?? 0
  if (Date.now() < expiresAt - 5 * 60 * 1000) return decrypted

  if (!account.refreshToken) throw new Error('No refresh token available')
  const refreshed = await refreshAccessToken(decrypt(account.refreshToken))

  await prisma.connectedAccount.update({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    data: {
      accessToken: encrypt(refreshed.accessToken),
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
    },
  })
  return refreshed.accessToken
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

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 404 })

  const meta = account.metadata as Record<string, string> | null
  const customerId = meta?.googleAdsCustomerId ?? ''
  const propertyId = account.propertyId ?? ''

  const cacheKey = `${startDate}:${endDate}`
  const cached = await prisma.analyticsCache.findUnique({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'google-ads', dataType: 'report', dateRange: cacheKey,
      },
    },
  })
  if (cached && Date.now() - cached.fetchedAt.getTime() < 6 * 60 * 60 * 1000) {
    return Response.json(cached.data)
  }

  let accessToken: string
  try {
    accessToken = await resolveAccessToken(workspaceId, account)
  } catch (e) {
    return Response.json({ error: `Token error: ${e instanceof Error ? e.message : e}` }, { status: 500 })
  }

  let report
  // Try native Google Ads API first; fall back to GA4-linked data if unavailable
  if (customerId && accessToken !== DUMMY_TOKEN) {
    try {
      report = await getAdsReport(accessToken, customerId, startDate, endDate)
    } catch {
      // Native Ads API failed (likely pending developer token approval) — fall through to GA4
    }
  }

  if (!report) {
    if (!propertyId) {
      return Response.json({ error: 'Google Ads not configured and no GA4 property found' }, { status: 404 })
    }
    try {
      report = await getAdsReportFromGA4(accessToken, propertyId, startDate, endDate)
    } catch (e) {
      return Response.json({ error: e instanceof Error ? e.message : 'Google Ads data unavailable' }, { status: 502 })
    }
  }

  await prisma.analyticsCache.upsert({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'google-ads', dataType: 'report', dateRange: cacheKey,
      },
    },
    update: { data: report as object, fetchedAt: new Date() },
    create: {
      workspaceId, provider: 'google-ads', dataType: 'report',
      dateRange: cacheKey, data: report as object,
    },
  })

  return Response.json(report)
}
