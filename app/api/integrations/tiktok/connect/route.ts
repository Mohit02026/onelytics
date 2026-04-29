import { auth } from '@/lib/auth'
import crypto from 'crypto'
import { buildTikTokOAuthUrl } from '@/services/tiktok/auth'

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const state = crypto.randomBytes(32).toString('hex')
  const url = buildTikTokOAuthUrl(state)

  const res = Response.json({ url })
  res.headers.set(
    'Set-Cookie',
    `tiktok_oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`
  )
  return res
}
