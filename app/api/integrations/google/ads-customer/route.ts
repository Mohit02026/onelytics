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
    const ids = resourceNames.map((name) => name.replace('customers/', ''))

    // Fetch account names in parallel via GAQL (one call per customer)
    const nameResults = await Promise.allSettled(
      ids.map((id) =>
        fetch(`https://googleads.googleapis.com/v24/customers/${id}/googleAds:searchStream`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': devToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1' }),
        })
          .then((r) => r.ok ? r.json() : null)
          .then((chunks: { results?: { customer: { id: string; descriptive_name: string } }[] }[] | null) => {
            const row = chunks?.[0]?.results?.[0]?.customer
            return row ? { id: String(row.id), name: row.descriptive_name } : null
          })
          .catch(() => null)
      )
    )

    const nameMap: Record<string, string> = {}
    for (const r of nameResults) {
      if (r.status === 'fulfilled' && r.value) nameMap[r.value.id] = r.value.name
    }

    const customers = ids.map((id) => ({
      id,
      formatted: id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
      name: nameMap[id] ?? null,
    }))

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
