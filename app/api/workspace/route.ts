import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMembership, canManageMembers } from '@/lib/workspace'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user
  const membership = await getMembership(userId, workspaceId)
  if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  })

  return Response.json({ ...workspace, role: membership.role })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user
  const membership = await getMembership(userId, workspaceId)
  if (!membership || !canManageMembers(membership.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = z.object({ name: z.string().min(1).max(80) }).safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid name' }, { status: 400 })

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  })

  return Response.json(workspace)
}
