import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Not connected' }, { status: 404 })

  await prisma.connectedAccount.delete({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })

  // Clear cached analytics data for this workspace
  await prisma.analyticsCache.deleteMany({
    where: { workspaceId, provider: { in: ['ga4', 'google-ads', 'gsc'] } },
  })

  return Response.json({ success: true })
}
