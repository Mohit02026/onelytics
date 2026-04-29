import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMembership } from '@/lib/workspace'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user
  const membership = await getMembership(userId, workspaceId)
  if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const [members, invites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.workspaceInvite.findMany({
      where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return Response.json({ members, invites, currentUserRole: membership.role })
}
