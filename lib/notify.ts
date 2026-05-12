import { prisma } from '@/lib/db'

export type NotifyEvent =
  | { type: 'report_ready'; title: string; reportId: string }
  | { type: 'report_failed'; title: string }
  | { type: 'integration_disconnected'; provider: string }
  | { type: 'member_joined'; name: string; email: string }

function buildSlackBlocks(workspaceName: string, event: NotifyEvent) {
  switch (event.type) {
    case 'report_ready':
      return {
        text: `✅ Report ready — ${event.title}`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `*✅ Report ready*\n*${event.title}*` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `Workspace: ${workspaceName}` }] },
        ],
      }
    case 'report_failed':
      return {
        text: `❌ Report failed — ${event.title}`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `*❌ Report generation failed*\n*${event.title}*` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `Workspace: ${workspaceName}` }] },
        ],
      }
    case 'integration_disconnected':
      return {
        text: `🔌 Integration disconnected — ${event.provider}`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `*🔌 Integration disconnected*\n*${event.provider}* was disconnected from *${workspaceName}*` } },
        ],
      }
    case 'member_joined':
      return {
        text: `👋 New member — ${event.name || event.email}`,
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: `*👋 New member joined*\n${event.name ? `*${event.name}* (${event.email})` : event.email} joined *${workspaceName}*` } },
        ],
      }
  }
}

export async function notifyWorkspace(workspaceId: string, event: NotifyEvent) {
  let webhook: string | null = null
  let workspaceName = 'Workspace'

  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slackWebhookUrl: true, name: true },
    })
    webhook = ws?.slackWebhookUrl ?? null
    workspaceName = ws?.name ?? 'Workspace'
  } catch {
    return
  }

  if (!webhook) return

  const payload = buildSlackBlocks(workspaceName, event)

  fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {})
}
