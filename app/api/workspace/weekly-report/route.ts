import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMembership, canConnectIntegrations } from '@/lib/workspace'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId, id: userId } = session.user

  const [workspace, viewerMailbox] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        weeklyReportEnabled: true,
        weeklyReportRecipients: true,
        weeklyReportSenderId: true,
        weeklyReportLastSentAt: true,
      },
    }),
    prisma.connectedMailbox.findUnique({
      where: { userId_provider: { userId, provider: 'google' } },
      select: { emailAddress: true },
    }),
  ])

  if (!workspace) return Response.json({ error: 'Workspace not found' }, { status: 404 })

  let senderEmail: string | null = null
  if (workspace.weeklyReportSenderId) {
    const sender = await prisma.connectedMailbox.findUnique({
      where: { userId_provider: { userId: workspace.weeklyReportSenderId, provider: 'google' } },
      select: { emailAddress: true },
    })
    senderEmail = sender?.emailAddress ?? null
  }

  return Response.json({
    enabled: workspace.weeklyReportEnabled,
    recipients: workspace.weeklyReportRecipients,
    lastSentAt: workspace.weeklyReportLastSentAt,
    senderEmail,
    viewerMailboxConnected: !!viewerMailbox,
    viewerMailboxEmail: viewerMailbox?.emailAddress ?? null,
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

  if (enabled !== undefined) {
    if (enabled) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { weeklyReportSenderId: true },
      })
      if (!workspace?.weeklyReportSenderId) {
        const mailbox = await prisma.connectedMailbox.findUnique({
          where: { userId_provider: { userId, provider: 'google' } },
        })
        if (!mailbox) {
          return Response.json(
            { error: 'Connect your email in Settings before enabling weekly reports.' },
            { status: 400 }
          )
        }
        data.weeklyReportSenderId = userId
      }
    }
    data.weeklyReportEnabled = enabled
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
    select: { weeklyReportEnabled: true, weeklyReportRecipients: true, weeklyReportSenderId: true },
  })

  // Same field names as GET, so the client can merge this response straight
  // into its existing state without a separate re-fetch.
  return Response.json({
    enabled: updated.weeklyReportEnabled,
    recipients: updated.weeklyReportRecipients,
    weeklyReportSenderId: updated.weeklyReportSenderId,
  })
}
