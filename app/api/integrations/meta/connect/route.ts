import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildMetaOAuthUrl } from '@/services/meta/auth'
import { redis } from '@/lib/redis'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = crypto.randomBytes(32).toString('hex')
  const url = buildMetaOAuthUrl(state)

  // Store state in Redis so callback can verify without relying on cookies
  await redis.set(
    `meta_oauth_state:${state}`,
    JSON.stringify({ workspaceId: session.user.workspaceId, userId: session.user.id }),
    'EX',
    600
  )

  return NextResponse.json({ url })
}
