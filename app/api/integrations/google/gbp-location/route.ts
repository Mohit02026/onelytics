import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { resolveGoogleToken } from '@/services/google/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await prisma.connectedAccount.findFirst({
    where: { workspaceId: session.user.workspaceId, provider: 'google' },
  })

  if (!account) return NextResponse.json({ error: 'Google not connected' }, { status: 400 })

  try {
    const accessToken = await resolveGoogleToken(session.user.workspaceId, account)

    // 1. Fetch Accounts
    const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!accRes.ok) {
      const errBody = await accRes.json().catch(() => ({}))
      const msg = (errBody as { error?: { message?: string } })?.error?.message ?? `HTTP ${accRes.status}`
      throw new Error(`GBP accounts API error: ${msg}`)
    }

    const accData = await accRes.json()
    const accounts = accData.accounts || []
    
    if (accounts.length === 0) {
      return NextResponse.json([])
    }

    // 2. Fetch Locations for all accounts
    const locations = []
    
    for (const acc of accounts) {
      const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode,storefrontAddress`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (locRes.ok) {
        const locData = await locRes.json()
        for (const loc of (locData.locations || [])) {
          locations.push({
            id: loc.name,
            name: loc.title || loc.name,
            address: loc.storefrontAddress?.addressLines?.join(', ') || ''
          })
        }
      }
    }

    return NextResponse.json(locations)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('GBP fetch error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

const postSchema = z.object({
  locationId: z.string().min(1),
  locationName: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { locationId, locationName } = parsed.data

    const account = await prisma.connectedAccount.findFirst({
      where: { workspaceId: session.user.workspaceId, provider: 'google' },
    })

    if (!account) return NextResponse.json({ error: 'Google not connected' }, { status: 400 })

    const currentMeta = (account.metadata as Record<string, string>) || {}
    const newMeta = {
      ...currentMeta,
      gbpLocationId: locationId,
      gbpLocationName: locationName,
    }

    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { metadata: newMeta },
    })

    // Clear GBP cache
    await prisma.analyticsCache.deleteMany({
      where: { workspaceId: session.user.workspaceId, provider: 'gbp' }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
