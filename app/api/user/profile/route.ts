import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  phone: z.string().max(30).optional().nullable(),
  jobTitle: z.string().max(80).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
  timezone: z.string().max(60).optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, jobTitle: true, avatarUrl: true, timezone: true },
  })

  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Password change path
  if (body.currentPassword !== undefined) {
    const parsed = passwordSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } })
    if (!user?.password) return NextResponse.json({ error: 'No password set' }, { status: 400 })

    const match = await bcrypt.compare(parsed.data.currentPassword, user.password)
    if (!match) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

    const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } })
    return NextResponse.json({ success: true })
  }

  // Profile update path
  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      jobTitle: parsed.data.jobTitle,
      avatarUrl: parsed.data.avatarUrl || null,
      timezone: parsed.data.timezone,
    },
    select: { id: true, name: true, email: true, phone: true, jobTitle: true, avatarUrl: true, timezone: true },
  })

  return NextResponse.json(user)
}
