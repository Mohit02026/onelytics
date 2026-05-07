import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveGoogleToken } from '@/services/google/auth'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId: session.user.workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 400 })

  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!devToken) return Response.json({ error: 'No developer token configured' }, { status: 400 })

  try {
    const accessToken = await resolveGoogleToken(session.user.workspaceId, account)
    const res = await fetch('https://googleads.googleapis.com/v24/customers:listAccessibleCustomers', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': devToken,
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const msg = (err as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
      return Response.json({ error: msg }, { status: res.status })
    }

    const data = await res.json()
    const resourceNames: string[] = data.resourceNames ?? []
    const customers = resourceNames.map((name) => {
      const id = name.replace('customers/', '')
      const formatted = id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
      return { id, formatted }
    })

    return Response.json(customers)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return Response.json({ error: msg }, { status: 500 })
  }
}

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

  await prisma.analyticsCache.deleteMany({
    where: { workspaceId, provider: 'google-ads' },
  })

  return Response.json({ success: true })
}
