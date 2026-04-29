import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildTikTokOAuthUrl } from '@/services/tiktok/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = crypto.randomBytes(32).toString('hex')
  const url = buildTikTokOAuthUrl(state)

  const res = NextResponse.json({ url })
  res.cookies.set('tiktok_oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  })
  return res
}
