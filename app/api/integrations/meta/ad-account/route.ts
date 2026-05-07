import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encryption'
import { z } from 'zod'

const GRAPH_VERSION = 'v22.0'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId: session.user.workspaceId, provider: 'meta' } },
  })
  if (!account) return Response.json({ error: 'Meta not connected' }, { status: 404 })

  const token = decrypt(account.accessToken)

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${token}`
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return Response.json({ error: (err as { error?: { message?: string } }).error?.message ?? 'Failed to fetch ad accounts' }, { status: 502 })
  }

  const data = await res.json()
  const accounts = (data.data ?? []).map((a: { id: string; name: string; account_status: number }) => ({
    id: a.id,           // already in act_XXXX format
    name: a.name,
    active: a.account_status === 1,
  }))

  return Response.json(accounts)
}

const schema = z.object({
  adAccountId: z
    .string()
    .regex(/^act_\d+$/, 'Format must be: act_XXXXXXXXXX'),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid ad account ID' },
      { status: 400 }
    )
  }

  const workspaceId = session.user.workspaceId

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'meta' } },
  })
  if (!account) return Response.json({ error: 'Meta not connected' }, { status: 404 })

  await prisma.connectedAccount.update({
    where: { workspaceId_provider: { workspaceId, provider: 'meta' } },
    data: { propertyId: parsed.data.adAccountId },
  })

  await prisma.analyticsCache.deleteMany({
    where: { workspaceId, provider: 'meta' },
  })

  return Response.json({ success: true })
}
