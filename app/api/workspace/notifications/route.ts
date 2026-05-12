import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  slackWebhookUrl: z.string().url().or(z.literal('')).nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const ws = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { slackWebhookUrl: true },
  })

  return Response.json({ slackWebhookUrl: ws?.slackWebhookUrl ?? null })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { slackWebhookUrl } = parsed.data
  await prisma.workspace.update({
    where: { id: session.user.workspaceId },
    data: { slackWebhookUrl: slackWebhookUrl || null },
  })

  return Response.json({ ok: true })
}
