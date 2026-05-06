import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { exchangeCodeForTokens } from '@/services/google/auth'
import { redis } from '@/lib/redis'

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

  const stored = await redis.get(`google_oauth_state:${state}`)
  if (!stored) {
    return NextResponse.redirect(`${BASE}/connect?error=invalid_state`)
  }

  const { workspaceId } = JSON.parse(stored) as { workspaceId: string; userId: string }
  await redis.del(`google_oauth_state:${state}`)

  const validServices = ['ga4', 'gsc', 'ads', 'gbp']
  const servicePart = state.split(':')[0]
  const service = validServices.includes(servicePart) ? servicePart : 'ga4'

  try {
    const tokens = await exchangeCodeForTokens(code)

    await prisma.connectedAccount.upsert({
      where: { workspaceId_provider: { workspaceId, provider: 'google' } },
      update: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: tokens.scope,
      },
      create: {
        workspaceId,
        provider: 'google',
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: tokens.scope,
      },
    })

    return NextResponse.redirect(`${BASE}/connect?google=connected&service=${service}`)
  } catch {
    return NextResponse.redirect(`${BASE}/connect?error=token_exchange_failed`)
  }
}
