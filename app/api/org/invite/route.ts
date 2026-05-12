import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendOrgInviteEmail } from '@/lib/email'
import { z } from 'zod'
import crypto from 'crypto'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { organizationId, id: userId } = session.user

  // Only org OWNER or ADMIN can invite
  const membership = await prisma.orgMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  })
  if (!membership || membership.role === 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { email, role } = parsed.data

  // Check already a member
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    const alreadyMember = await prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: existing.id } },
    })
    if (alreadyMember) {
      return NextResponse.json({ error: 'Already a member of this organisation.' }, { status: 409 })
    }
  }

  // Revoke existing pending invite
  await prisma.orgInvite.deleteMany({
    where: { organizationId, email, acceptedAt: null },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const invite = await prisma.orgInvite.create({
    data: {
      organizationId,
      email,
      role,
      token,
      invitedById: userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } })
  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/org/${token}`

  await sendOrgInviteEmail({
    to: email,
    inviteUrl,
    orgName: org?.name ?? 'your agency',
    role,
  })

  return NextResponse.json({ id: invite.id, email, role, inviteUrl })
}
