import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const invite = await prisma.orgInvite.findUnique({
    where: { token: params.token },
    include: { organization: { select: { name: true } } },
  })

  if (!invite) return Response.json({ error: 'Invalid invite link.' }, { status: 404 })
  if (invite.acceptedAt) return Response.json({ error: 'This invite has already been used.' }, { status: 410 })
  if (invite.expiresAt < new Date()) return Response.json({ error: 'This invite has expired.' }, { status: 410 })

  return Response.json({
    orgName: invite.organization.name,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    type: 'org',
  })
}

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const invite = await prisma.orgInvite.findUnique({
    where: { token: params.token },
    include: { organization: { select: { id: true, name: true } } },
  })

  if (!invite) return Response.json({ error: 'Invalid invite link.' }, { status: 404 })
  if (invite.acceptedAt) return Response.json({ error: 'Already used.' }, { status: 410 })
  if (invite.expiresAt < new Date()) return Response.json({ error: 'Expired.' }, { status: 410 })

  const userId = session.user.id
  const organizationId = invite.organizationId

  const existing = await prisma.orgMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  })

  if (!existing) {
    await prisma.orgMember.create({
      data: { organizationId, userId, role: invite.role },
    })
    // Give access to the first workspace in the org
    const firstWorkspace = await prisma.workspace.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    })
    if (firstWorkspace) {
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: firstWorkspace.id, userId } },
        create: { workspaceId: firstWorkspace.id, userId, role: invite.role === 'OWNER' ? 'OWNER' : invite.role === 'ADMIN' ? 'ADMIN' : 'MEMBER' },
        update: {},
      })
      await prisma.user.update({
        where: { id: userId },
        data: { workspaceId: firstWorkspace.id, organizationId },
      })
    }
  }

  await prisma.orgInvite.update({
    where: { token: params.token },
    data: { acceptedAt: new Date() },
  })

  return Response.json({ orgName: invite.organization.name, organizationId })
}
