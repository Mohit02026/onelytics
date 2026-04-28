import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId

  const accounts = await prisma.connectedAccount.findMany({
    where: { workspaceId },
    select: { provider: true, propertyId: true, connectedAt: true },
  })

  const status = {
    google: false,
    meta: false,
    propertyId: null as string | null,
  }

  for (const account of accounts) {
    if (account.provider === 'google') {
      status.google = true
      status.propertyId = account.propertyId
    }
    if (account.provider === 'meta') {
      status.meta = true
    }
  }

  return Response.json(status)
}
