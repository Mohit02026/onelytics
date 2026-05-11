import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'
import { getKeywordVolumes, DUMMY_TOKEN } from '@/services/google/ads'
import { refreshAccessToken } from '@/services/google/auth'
import { z } from 'zod'

const schema = z.object({
  keywords: z.string().min(1),
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
  const parsed = schema.safeParse({ keywords: searchParams.get('keywords') })
  if (!parsed.success) return Response.json({ error: 'Missing keywords param' }, { status: 400 })

  const keywords = parsed.data.keywords.split(',').map((k) => k.trim()).filter(Boolean)
  if (keywords.length === 0) return Response.json({})

  const workspaceId = session.user.workspaceId

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 404 })

  const meta = account.metadata as Record<string, string> | null
  const customerId = meta?.googleAdsCustomerId ?? ''
  if (!customerId) return Response.json({ error: 'Google Ads customer ID not set' }, { status: 404 })

  // Cache key: sorted unique keywords, 24hr TTL
  const cacheKey = keywords.slice().sort().join(',').slice(0, 800)
  const cached = await prisma.analyticsCache.findUnique({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'keyword-volume', dataType: 'report', dateRange: cacheKey,
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

  // Dummy path: return seeded fake volumes
  if (accessToken === DUMMY_TOKEN) {
    const dummy: Record<string, number> = {}
    for (const kw of keywords) {
      const seed = kw.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      dummy[kw.toLowerCase()] = (seed % 10) * 1000 + 500
    }
    return Response.json(dummy)
  }

  let volumes: Record<string, number>
  try {
    volumes = await getKeywordVolumes(accessToken, customerId, keywords)
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch keyword volumes' },
      { status: 502 }
    )
  }

  await prisma.analyticsCache.upsert({
    where: {
      workspaceId_provider_dataType_dateRange: {
        workspaceId, provider: 'keyword-volume', dataType: 'report', dateRange: cacheKey,
      },
    },
    update: { data: volumes as object, fetchedAt: new Date() },
    create: {
      workspaceId, provider: 'keyword-volume', dataType: 'report',
      dateRange: cacheKey, data: volumes as object,
    },
  })

  return Response.json(volumes)
}
