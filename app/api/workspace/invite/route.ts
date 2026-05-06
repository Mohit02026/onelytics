import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMembership, canManageMembers } from '@/lib/workspace'
import { z } from 'zod'
import crypto from 'crypto'
import { sendInviteEmail } from '@/lib/email'
import type { MemberRole } from '@prisma/client'

const schema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user
  const membership = await getMembership(userId, workspaceId)
  if (!membership || !canManageMembers(membership.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { email, role } = parsed.data

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existingUser) {
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
    })
    if (existingMember) {
      return Response.json({ error: 'This user is already a member of the workspace.' }, { status: 409 })
    }
  }

  // Revoke any existing pending invite for this email
  await prisma.workspaceInvite.deleteMany({
    where: { workspaceId, email, acceptedAt: null },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email,
      role: role as MemberRole,
      token,
      invitedById: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    select: { id: true, email: true, role: true, token: true, expiresAt: true },
  })

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } })
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`

  await sendInviteEmail({
    to: email,
    inviteUrl,
    workspaceName: workspace?.name ?? 'your workspace',
    role,
  })

  return Response.json({ ...invite, inviteUrl })
}
