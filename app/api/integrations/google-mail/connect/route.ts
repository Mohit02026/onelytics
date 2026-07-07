import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildMailOAuthUrl } from '@/services/google/mail-auth'
import { redis } from '@/lib/redis'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = crypto.randomBytes(32).toString('hex')
  const url = buildMailOAuthUrl(state)

  await redis.set(
    `google_mail_oauth_state:${state}`,
    JSON.stringify({ userId: session.user.id }),
    'EX',
    600
  )

  return NextResponse.json({ url })
}
