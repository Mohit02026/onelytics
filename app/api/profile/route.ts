import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      memberships: {
        select: {
          role: true,
          workspace: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    hasPassword: !!user.password,
    workspaces: user.memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
    })),
  })
}
