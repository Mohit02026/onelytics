import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { exchangeCodeForTokens } from '@/services/google/auth'

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=')
      return [k.trim(), v.join('=')]
    })
  )
}

const BASE = process.env.NEXTAUTH_URL!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return Response.redirect(`${BASE}/connect?error=google_denied`)
  }

  if (!code || !state) {
    return Response.redirect(`${BASE}/connect?error=invalid_callback`)
  }

  // Verify CSRF state cookie
  const cookies = parseCookies(req.headers.get('cookie') ?? '')
  if (!cookies.oauth_state || cookies.oauth_state !== state) {
    return Response.redirect(`${BASE}/connect?error=invalid_state`)
  }

  const session = await auth()
  if (!session) {
    return Response.redirect(`${BASE}/login`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    await prisma.connectedAccount.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: session.user.workspaceId,
          provider: 'google',
        },
      },
      update: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: tokens.scope,
      },
      create: {
        workspaceId: session.user.workspaceId,
        provider: 'google',
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: tokens.scope,
      },
    })

    // Clear state cookie and redirect to connect page to set property ID
    const res = Response.redirect(`${BASE}/connect?google=connected`)
    res.headers.set('Set-Cookie', 'oauth_state=; HttpOnly; Path=/; Max-Age=0')
    return res
  } catch {
    return Response.redirect(`${BASE}/connect?error=token_exchange_failed`)
  }
}
