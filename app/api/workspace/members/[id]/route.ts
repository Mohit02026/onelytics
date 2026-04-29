import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMembership, canManageMembers } from '@/lib/workspace'
import { z } from 'zod'
import type { MemberRole } from '@prisma/client'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user
  const membership = await getMembership(userId, workspaceId)
  if (!membership || membership.role !== 'OWNER') {
    return Response.json({ error: 'Only owners can change roles' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = z.object({ role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']) }).safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid role' }, { status: 400 })

  const target = await prisma.workspaceMember.findUnique({
    where: { id: params.id },
    select: { workspaceId: true, userId: true },
  })
  if (!target || target.workspaceId !== workspaceId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (target.userId === userId) {
    return Response.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: params.id },
    data: { role: parsed.data.role as MemberRole },
    select: { id: true, role: true },
  })

  return Response.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user
  const membership = await getMembership(userId, workspaceId)
  if (!membership || !canManageMembers(membership.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { id: params.id },
    select: { workspaceId: true, userId: true, role: true },
  })
  if (!target || target.workspaceId !== workspaceId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  if (target.userId === userId) {
    return Response.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }
  if (target.role === 'OWNER' && membership.role !== 'OWNER') {
    return Response.json({ error: 'Cannot remove an owner' }, { status: 403 })
  }

  await prisma.workspaceMember.delete({ where: { id: params.id } })
  return Response.json({ success: true })
}
