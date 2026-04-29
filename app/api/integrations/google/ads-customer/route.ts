import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  customerId: z.string().regex(/^\d{3}-\d{3}-\d{4}$|^\d+$/, 'Enter a numeric customer ID (e.g. 123-456-7890 or 1234567890)'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid customer ID' },
      { status: 400 }
    )
  }

  const workspaceId = session.user.workspaceId
  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 404 })

  const existing = (account.metadata as Record<string, unknown>) ?? {}
  const normalized = parsed.data.customerId.replace(/-/g, '')
  await prisma.connectedAccount.update({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    data: { metadata: { ...existing, googleAdsCustomerId: normalized } },
  })

  return Response.json({ success: true })
}
