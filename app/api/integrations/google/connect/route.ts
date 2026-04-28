import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { z } from 'zod'

const schema = z.object({
  propertyId: z.string().min(1).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error }, { status: 400 })

  const workspaceId = session.user.workspaceId

  const existing = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (existing) return Response.json({ error: 'Already connected' }, { status: 409 })

  // Dummy tokens — replaced with real OAuth tokens in Phase 2 proper
  const dummyAccessToken = encrypt('dummy_access_token')
  const dummyRefreshToken = encrypt('dummy_refresh_token')

  await prisma.connectedAccount.create({
    data: {
      workspaceId,
      provider: 'google',
      propertyId: parsed.data.propertyId ?? 'properties/123456789',
      accessToken: dummyAccessToken,
      refreshToken: dummyRefreshToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
    },
  })

  return Response.json({ success: true })
}
