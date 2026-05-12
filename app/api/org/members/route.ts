import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await prisma.orgMember.findMany({
    where: { organizationId: session.user.organizationId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  const invites = await prisma.orgInvite.findMany({
    where: { organizationId: session.user.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, email: true, role: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ members, invites })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Only OWNER can remove members
  const me = await prisma.orgMember.findUnique({
    where: { organizationId_userId: { organizationId: session.user.organizationId, userId: session.user.id } },
  })
  if (!me || me.role !== 'OWNER') return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { memberId, inviteId } = await req.json().catch(() => ({}))

  if (memberId) {
    // Can't remove yourself
    if (memberId === session.user.id) return Response.json({ error: 'Cannot remove yourself' }, { status: 400 })
    await prisma.orgMember.delete({
      where: { organizationId_userId: { organizationId: session.user.organizationId, userId: memberId } },
    })
  } else if (inviteId) {
    await prisma.orgInvite.delete({ where: { id: inviteId } })
  } else {
    return Response.json({ error: 'Missing memberId or inviteId' }, { status: 400 })
  }

  return Response.json({ ok: true })
}
