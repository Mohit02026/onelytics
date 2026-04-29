import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { buildGoogleOAuthUrl } from '@/services/google/auth'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const service = searchParams.get('service') ?? 'ga4'

  const csrf = crypto.randomBytes(32).toString('hex')
  const state = `${service}:${csrf}`
  const url = buildGoogleOAuthUrl(state)

  const res = NextResponse.json({ url })
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    sameSite: 'lax',
    path: '/',
  })
  return res
}
