import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  orgName: z.string().min(1).max(80).optional(),
  workspaceName: z.string().min(1).max(80).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true },
  })
  return NextResponse.json({ onboarded: user?.onboarded ?? false })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: userId, workspaceId, organizationId } = session.user
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { orgName, workspaceName } = parsed.data

  if (orgName && organizationId) {
    await prisma.organization.update({ where: { id: organizationId }, data: { name: orgName } })
  }
  if (workspaceName && workspaceId) {
    await prisma.workspace.update({ where: { id: workspaceId }, data: { name: workspaceName } })
  }

  await prisma.user.update({ where: { id: userId }, data: { onboarded: true } })

  return NextResponse.json({ success: true })
}
