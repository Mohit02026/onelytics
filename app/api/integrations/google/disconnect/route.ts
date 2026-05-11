import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId
  const { searchParams } = new URL(req.url)
  const service = searchParams.get('service') // 'ads' | 'gsc' | 'gbp' | 'ga4' | null (null = all)

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Not connected' }, { status: 404 })

  const meta = (account.metadata as Record<string, unknown> | null) ?? {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toJson = (obj: Record<string, unknown>) => obj as any

  if (service === 'ads') {
    // Only clear the Google Ads customer ID from metadata
    const { googleAdsCustomerId: _, ...rest } = meta
    await prisma.connectedAccount.update({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
      data: { metadata: toJson(rest) },
    })
    await prisma.analyticsCache.deleteMany({ where: { workspaceId, provider: 'google-ads' } })

  } else if (service === 'gsc') {
    const { gscSiteUrl: _, ...rest } = meta
    await prisma.connectedAccount.update({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
      data: { metadata: toJson(rest) },
    })
    await prisma.analyticsCache.deleteMany({ where: { workspaceId, provider: 'gsc' } })

  } else if (service === 'gbp') {
    const { gbpLocationId: _id, gbpLocationName: _name, ...rest } = meta
    await prisma.connectedAccount.update({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
      data: { metadata: toJson(rest) },
    })
    await prisma.analyticsCache.deleteMany({ where: { workspaceId, provider: 'gbp' } })

  } else if (service === 'ga4') {
    await prisma.connectedAccount.update({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
      data: { propertyId: null },
    })
    await prisma.analyticsCache.deleteMany({ where: { workspaceId, provider: 'ga4' } })

  } else {
    // Disconnect all Google services — delete the entire row
    await prisma.connectedAccount.delete({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    })
    await prisma.analyticsCache.deleteMany({
      where: { workspaceId, provider: { in: ['ga4', 'google-ads', 'gsc', 'gbp'] } },
    })
  }

  return Response.json({ success: true })
}
