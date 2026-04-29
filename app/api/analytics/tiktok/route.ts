import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { getTikTokReport } from '@/services/tiktok/ads'
import { refreshAccessToken } from '@/services/tiktok/auth'
import { encrypt } from '@/lib/encryption'
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

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
    where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } },
  })
  if (!account) return Response.json({ error: 'TikTok not connected' }, { status: 404 })

  const cacheKey = `${startDate}:${endDate}`
  const cached = await prisma.analyticsCache.findUnique({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'tiktok', dataType: 'report', dateRange: cacheKey,
      },
    },
  })
  if (cached && Date.now() - cached.fetchedAt.getTime() < 6 * 60 * 60 * 1000) {
    return Response.json(cached.data)
  }

  let accessToken = decrypt(account.accessToken)

  // Refresh if token expired or expiring soon (within 1 hour)
  if (account.refreshToken && account.expiresAt && account.expiresAt.getTime() - Date.now() < 3600 * 1000) {
    try {
      const newTokens = await refreshAccessToken(decrypt(account.refreshToken))
      await prisma.connectedAccount.update({
        where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } },
        data: {
          accessToken: encrypt(newTokens.accessToken),
          refreshToken: encrypt(newTokens.refreshToken),
          expiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
        },
      })
      accessToken = newTokens.accessToken
    } catch {
      // proceed with existing token
    }
  }

  const advertiserId = account.propertyId ?? ''
  const report = await getTikTokReport(accessToken, advertiserId, startDate, endDate)

  await prisma.analyticsCache.upsert({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'tiktok', dataType: 'report', dateRange: cacheKey,
      },
    },
    update: { data: report as object, fetchedAt: new Date() },
    create: {
      workspaceId, provider: 'tiktok', dataType: 'report',
      dateRange: cacheKey, data: report as object,
    },
  })

  return Response.json(report)
}
