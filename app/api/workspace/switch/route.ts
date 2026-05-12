import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const switchSchema = z.object({ workspaceId: z.string().uuid() })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = switchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid workspaceId' }, { status: 400 })

  const { workspaceId } = parsed.data

  // Verify the user is actually a member of the target workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Update the user's active workspace in DB
  await prisma.user.update({
    where: { id: session.user.id },
    data: { workspaceId },
  })

  return NextResponse.json({ workspaceId })
}
