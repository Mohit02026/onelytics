import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: { select: { id: true, name: true, clientLogoUrl: true, clientColor: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  const workspaces = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    logoUrl: m.workspace.clientLogoUrl,
    color: m.workspace.clientColor ?? '#2563eb',
    role: m.role,
    isActive: m.workspace.id === session.user.workspaceId,
  }))

  return NextResponse.json({ workspaces })
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name: parsed.data.name,
        organizationId: session.user.organizationId ?? undefined,
      },
    })
    await tx.workspaceMember.create({
      data: { workspaceId: ws.id, userId: session.user.id, role: 'OWNER' },
    })
    return ws
  })

  return NextResponse.json({ id: workspace.id, name: workspace.name }, { status: 201 })
}
