import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'
import { getGa4Report, DUMMY_TOKEN } from '@/services/google/ga4'
import { refreshAccessToken } from '@/services/google/auth'
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Returns a valid (non-expired) access token, refreshing if needed.
async function resolveAccessToken(
  workspaceId: string,
  account: {
    accessToken: string
    refreshToken: string | null
    expiresAt: Date | null
  }
): Promise<string> {
  const decrypted = decrypt(account.accessToken)

  // Dummy tokens don't expire
  if (decrypted === DUMMY_TOKEN) return DUMMY_TOKEN

  // Refresh if token expires within the next 5 minutes
  const expiresAt = account.expiresAt?.getTime() ?? 0
  if (Date.now() < expiresAt - 5 * 60 * 1000) return decrypted

  if (!account.refreshToken) throw new Error('No refresh token available')

  const decryptedRefresh = decrypt(account.refreshToken)
  const refreshed = await refreshAccessToken(decryptedRefresh)

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

  // Check 6-hour cache
  const cacheKey = `${startDate}:${endDate}`
  const cached = await prisma.analyticsCache.findUnique({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId,
        provider: 'ga4',
        dataType: 'report',
        dateRange: cacheKey,
      },
    },
  })

  if (cached && Date.now() - cached.fetchedAt.getTime() < 6 * 60 * 60 * 1000) {
    return Response.json(cached.data)
  }

  const accessToken = await resolveAccessToken(workspaceId, account)
  const report = await getGa4Report(accessToken, account.propertyId ?? '', startDate, endDate)

  await prisma.analyticsCache.upsert({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId,
        provider: 'ga4',
        dataType: 'report',
        dateRange: cacheKey,
      },
    },
    update: { data: report as object, fetchedAt: new Date() },
    create: {
      workspaceId,
      provider: 'ga4',
      dataType: 'report',
      dateRange: cacheKey,
      data: report as object,
    },
  })

  return Response.json(report)
}
