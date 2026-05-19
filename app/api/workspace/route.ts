import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMembership, canManageMembers } from '@/lib/workspace'
import { z } from 'zod'
import { randomBytes, scryptSync } from 'crypto'

function hashPortalPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const WORKSPACE_SELECT = {
  id: true,
  name: true,
  createdAt: true,
  clientLogoUrl: true,
  clientColor: true,
  clientContactName: true,
  clientContactEmail: true,
  timezone: true,
  currency: true,
  portalEnabled: true,
  portalToken: true,
  _count: { select: { members: true } },
} as const

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user
  const membership = await getMembership(userId, workspaceId)
  if (!membership) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: WORKSPACE_SELECT,
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
  const parsed = z.object({
    name: z.string().min(1).max(80).optional(),
    clientLogoUrl: z.string().url().max(500).or(z.literal('')).optional(),
    clientColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    clientContactName: z.string().max(120).optional(),
    clientContactEmail: z.string().email().max(120).or(z.literal('')).optional(),
    timezone: z.string().max(60).optional(),
    currency: z.string().length(3).optional(),
    portalEnabled: z.boolean().optional(),
    portalPassword: z.string().max(100).nullable().optional(),
  }).safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { portalEnabled, portalPassword, ...rest } = parsed.data
  const updateData: Record<string, unknown> = { ...rest }

  if (portalPassword !== undefined) {
    updateData.portalPassword = portalPassword !== null ? hashPortalPassword(portalPassword) : null
  }

  // Auto-generate portal token when enabling portal for the first time
  if (portalEnabled === true) {
    const existing = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { portalToken: true },
    })
    updateData.portalEnabled = true
    if (!existing?.portalToken) {
      updateData.portalToken = randomBytes(24).toString('hex')
    }
  } else if (portalEnabled === false) {
    updateData.portalEnabled = false
  }

  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: updateData,
    select: WORKSPACE_SELECT,
  })

  return Response.json({ ...workspace, role: membership.role })
}
