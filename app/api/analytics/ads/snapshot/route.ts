import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt, encrypt } from '@/lib/encryption'
import { getAdsKeywordSnapshot, DUMMY_TOKEN } from '@/services/google/ads'
import { refreshAccessToken } from '@/services/google/auth'

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

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 404 })

  const meta = account.metadata as Record<string, string> | null
  const customerId = meta?.googleAdsCustomerId ?? ''
  if (!customerId) return Response.json({ error: 'No Google Ads customer ID configured' }, { status: 404 })

  const cached = await prisma.analyticsCache.findUnique({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'google-ads', dataType: 'snapshot', dateRange: 'latest',
      },
    },
  })
  if (cached && Date.now() - cached.fetchedAt.getTime() < 24 * 60 * 60 * 1000) {
    return Response.json(cached.data)
  }

  let accessToken: string
  try {
    accessToken = await resolveAccessToken(workspaceId, account)
  } catch (e) {
    return Response.json({ error: `Token error: ${e instanceof Error ? e.message : e}` }, { status: 500 })
  }

  if (accessToken === DUMMY_TOKEN) {
    return Response.json({})
  }

  let snapshot
  try {
    snapshot = await getAdsKeywordSnapshot(accessToken, customerId)
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Snapshot unavailable' }, { status: 502 })
  }

  await prisma.analyticsCache.upsert({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'google-ads', dataType: 'snapshot', dateRange: 'latest',
      },
    },
    update: { data: snapshot as object, fetchedAt: new Date() },
    create: {
      workspaceId, provider: 'google-ads', dataType: 'snapshot',
      dateRange: 'latest', data: snapshot as object,
    },
  })

  return Response.json(snapshot)
}
