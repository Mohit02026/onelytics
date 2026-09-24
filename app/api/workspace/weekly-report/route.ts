import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMembership, canConnectIntegrations } from '@/lib/workspace'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: {
      weeklyReportEnabled: true,
      weeklyReportRecipients: true,
      weeklyReportLastSentAt: true,
    },
  })

  if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 404 })

  return Response.json({
    enabled: workspace.weeklyReportEnabled,
    recipients: workspace.weeklyReportRecipients,
    lastSentAt: workspace.weeklyReportLastSentAt,
  })
}

const schema = z.object({
  enabled: z.boolean().optional(),
  recipients: z.array(z.string().email()).max(10).optional(),
})

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user
  const membership = await getMembership(userId, workspaceId)
  if (!membership || !canConnectIntegrations(membership.role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { enabled, recipients } = parsed.data
  const data: Record<string, unknown> = {}

  if (recipients) data.weeklyReportRecipients = recipients.map((r) => r.toLowerCase())

  if (enabled) {
    const effectiveRecipients = recipients ?? (
      await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { weeklyReportRecipients: true } })
    )?.weeklyReportRecipients ?? []
    if (effectiveRecipients.length === 0) {
      return Response.json({ error: 'Add at least one recipient before enabling weekly reports.' }, { status: 400 })
    }
  }
  if (enabled !== undefined) data.weeklyReportEnabled = enabled

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
    select: { weeklyReportEnabled: true, weeklyReportRecipients: true },
  })

  return Response.json({
    enabled: updated.weeklyReportEnabled,
    recipients: updated.weeklyReportRecipients,
  })
}
