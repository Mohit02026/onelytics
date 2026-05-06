import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildGoogleOAuthUrl } from '@/services/google/auth'
import { redis } from '@/lib/redis'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const service = searchParams.get('service') ?? 'ga4'

  const csrf = crypto.randomBytes(32).toString('hex')
  const state = `${service}:${csrf}`
  const url = buildGoogleOAuthUrl(state)

  await redis.set(
    `google_oauth_state:${state}`,
    JSON.stringify({ workspaceId: session.user.workspaceId, userId: session.user.id }),
    'EX',
    600
  )

  return NextResponse.json({ url })
}
