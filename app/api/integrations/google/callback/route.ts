import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { exchangeCodeForTokens } from '@/services/google/auth'

const BASE = process.env.NEXTAUTH_URL!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${BASE}/connect?error=google_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE}/connect?error=invalid_callback`)
  }

  // Verify CSRF state cookie using Next.js cookies() API
  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${BASE}/connect?error=invalid_state`)
  }

  const validServices = ['ga4', 'gsc', 'ads']
  const servicePart = state.split(':')[0]
  const service = validServices.includes(servicePart) ? servicePart : 'ga4'

  const session = await auth()
  if (!session) {
    return NextResponse.redirect(`${BASE}/login?callbackUrl=/connect`)
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

    const res = NextResponse.redirect(`${BASE}/connect?google=connected&service=${service}`)
    res.cookies.set('oauth_state', '', { maxAge: 0, path: '/' })
    return res
  } catch {
    return NextResponse.redirect(`${BASE}/connect?error=token_exchange_failed`)
  }
}
