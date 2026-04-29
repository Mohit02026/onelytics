import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  siteUrl: z.string().url('Must be a valid URL (e.g. https://example.com/)').or(
    z.string().regex(/^sc-domain:.+/, 'Domain property format: sc-domain:example.com')
  ),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid site URL' },
      { status: 400 }
    )
  }

  const workspaceId = session.user.workspaceId
  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 404 })

  const existing = (account.metadata as Record<string, unknown>) ?? {}
  await prisma.connectedAccount.update({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    data: { metadata: { ...existing, gscSiteUrl: parsed.data.siteUrl } },
  })

  return Response.json({ success: true })
}
