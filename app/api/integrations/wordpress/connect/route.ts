import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { DUMMY_CREDENTIALS } from '@/services/wordpress'
import { z } from 'zod'

const schema = z.object({
  siteUrl: z.string().url('Must be a valid URL (e.g. https://example.com)'),
  username: z.string().min(1, 'Username is required'),
  appPassword: z.string().min(1, 'Application password is required'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const workspaceId = session.user.workspaceId
  const { siteUrl, username, appPassword } = parsed.data

  // Encode credentials as base64(user:appPassword) — WordPress Basic Auth format
  const credentials =
    username === 'dummy' && appPassword === 'dummy'
      ? DUMMY_CREDENTIALS
      : Buffer.from(`${username}:${appPassword}`).toString('base64')

  await prisma.connectedAccount.upsert({
    where: { workspaceId_provider: { workspaceId, provider: 'wordpress' } },
    update: {
      accessToken: encrypt(credentials),
      propertyId: siteUrl.replace(/\/$/, ''),
      updatedAt: new Date(),
    },
    create: {
      workspaceId,
      provider: 'wordpress',
      accessToken: encrypt(credentials),
      propertyId: siteUrl.replace(/\/$/, ''),
    },
  })

  return Response.json({ success: true })
}
