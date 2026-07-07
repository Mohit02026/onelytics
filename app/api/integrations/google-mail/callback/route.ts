import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { exchangeMailCodeForTokens } from '@/services/google/mail-auth'
import { redis } from '@/lib/redis'

const BASE = process.env.NEXTAUTH_URL!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${BASE}/settings/profile?mailError=google_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BASE}/settings/profile?mailError=invalid_callback`)
  }

  const stored = await redis.get(`google_mail_oauth_state:${state}`)
  if (!stored) {
    return NextResponse.redirect(`${BASE}/settings/profile?mailError=invalid_state`)
  }

  const { userId } = JSON.parse(stored) as { userId: string }
  await redis.del(`google_mail_oauth_state:${state}`)

  try {
    const tokens = await exchangeMailCodeForTokens(code)

    await prisma.connectedMailbox.upsert({
      where: { userId_provider: { userId, provider: 'google' } },
      update: {
        emailAddress: tokens.emailAddress,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: tokens.scope,
      },
      create: {
        userId,
        provider: 'google',
        emailAddress: tokens.emailAddress,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: tokens.scope,
      },
    })

    return NextResponse.redirect(`${BASE}/settings/profile?mail=connected`)
  } catch {
    return NextResponse.redirect(`${BASE}/settings/profile?mailError=token_exchange_failed`)
  }
}
