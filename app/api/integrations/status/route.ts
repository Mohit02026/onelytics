import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId

  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId },
    select: { provider: true, propertyId: true, metadata: true, connectedAt: true },
  })

  const status = {
    google: false,
    meta: false,
    wordpress: false,
    tiktok: false,
    linkedin: false,
    propertyId: null as string | null,
    gscSiteUrl: null as string | null,
    wpSiteUrl: null as string | null,
    metaAdAccountId: null as string | null,
    tiktokAdvertiserId: null as string | null,
    linkedinAccountId: null as string | null,
  }

  for (const account of accounts) {
    if (account.provider === 'google') {
      status.google = true
      status.propertyId = account.propertyId
      const meta = account.metadata as Record<string, string> | null
      status.gscSiteUrl = meta?.gscSiteUrl ?? null
    }
    if (account.provider === 'meta') {
      status.meta = true
      status.metaAdAccountId = account.propertyId
    }
    if (account.provider === 'wordpress') {
      status.wordpress = true
      status.wpSiteUrl = account.propertyId
    }
    if (account.provider === 'tiktok') {
      status.tiktok = true
      status.tiktokAdvertiserId = account.propertyId
    }
    if (account.provider === 'linkedin') {
      status.linkedin = true
      status.linkedinAccountId = account.propertyId
    }
  }

  return Response.json(status)
}
