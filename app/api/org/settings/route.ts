import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

async function getOrgOwnerOrAdmin(userId: string, organizationId: string) {
  const m = await prisma.orgMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  })
  if (!m || m.role === 'MEMBER') return null
  return m
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { id: true, name: true, logoUrl: true, color: true, domain: true },
  })

  if (!org) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(org)
}

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().or(z.literal('')).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  domain: z.string().max(100).nullable().optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.organizationId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const m = await getOrgOwnerOrAdmin(session.user.id, session.user.organizationId)
  if (!m) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl || null
  if (parsed.data.color !== undefined) data.color = parsed.data.color
  if (parsed.data.domain !== undefined) data.domain = parsed.data.domain || null

  const org = await prisma.organization.update({
    where: { id: session.user.organizationId },
    data,
    select: { id: true, name: true, logoUrl: true, color: true, domain: true },
  })

  return Response.json(org)
}
