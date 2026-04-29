import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  advertiserId: z.string().regex(/^\d+$/, 'Advertiser ID must be numeric'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const workspaceId = session.user.workspaceId
  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } },
  })
  if (!account) return Response.json({ error: 'TikTok not connected' }, { status: 404 })

  await prisma.connectedAccount.update({
    where: { workspaceId_provider: { workspaceId, provider: 'tiktok' } },
    data: { propertyId: parsed.data.advertiserId },
  })

  return Response.json({ success: true })
}
