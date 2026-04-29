import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.connectedAccount.deleteMany({
    where: { workspaceId: session.user.workspaceId, provider: 'tiktok' },
  })

  return Response.json({ success: true })
}
