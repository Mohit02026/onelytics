import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId

  await prisma.connectedAccount.deleteMany({
    where: { workspaceId, provider: 'wordpress' },
  })

  return Response.json({ success: true })
}
