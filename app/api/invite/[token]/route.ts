import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token: params.token },
    include: { workspace: { select: { name: true } } },
  })

  if (!invite) return Response.json({ error: 'Invalid invite link.' }, { status: 404 })
  if (invite.acceptedAt) return Response.json({ error: 'This invite has already been used.' }, { status: 410 })
  if (invite.expiresAt < new Date()) return Response.json({ error: 'This invite has expired.' }, { status: 410 })

  return Response.json({
    workspaceName: invite.workspace.name,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
  })
}

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token: params.token },
    include: { workspace: { select: { id: true, name: true } } },
  })

  if (!invite) return Response.json({ error: 'Invalid invite link.' }, { status: 404 })
  if (invite.acceptedAt) return Response.json({ error: 'Already used.' }, { status: 410 })
  if (invite.expiresAt < new Date()) return Response.json({ error: 'Expired.' }, { status: 410 })

  const userId = session.user.id
  const workspaceId = invite.workspaceId

  // Upsert membership (don't downgrade if already a member)
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })

  if (!existing) {
    await prisma.workspaceMember.create({
      data: { workspaceId, userId, role: invite.role },
    })
    // Switch user's active workspace to the new one
    await prisma.user.update({
      where: { id: userId },
      data: { workspaceId },
    })
  }

  await prisma.workspaceInvite.update({
    where: { token: params.token },
    data: { acceptedAt: new Date() },
  })

  return Response.json({ workspaceName: invite.workspace.name, workspaceId })
}
