import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const patchSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { name, currentPassword, newPassword } = parsed.data
  const updateData: any = {}

  if (name) updateData.name = name

  if (newPassword) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user?.password) {
      return Response.json({ error: 'OAuth users cannot change password' }, { status: 400 })
    }
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      return Response.json({ error: 'Incorrect current password' }, { status: 400 })
    }
    updateData.password = await bcrypt.hash(newPassword, 12)
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  return Response.json({ success: true })
}

export async function DELETE() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.delete({ where: { id: session.user.id } })
  return Response.json({ success: true })
}
