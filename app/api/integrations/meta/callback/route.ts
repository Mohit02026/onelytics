import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { exchangeCodeForTokens } from '@/services/meta/auth'
import { redis } from '@/lib/redis'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const base = process.env.META_REDIRECT_URI
    ? new URL(process.env.META_REDIRECT_URI).origin
    : process.env.NEXTAUTH_URL!

  if (error) {
    return Response.redirect(`${base}/connect?error=meta_denied`)
  }

  if (!state || !code) {
    return Response.redirect(`${base}/connect?error=invalid_callback`)
  }

  // Verify state and retrieve user info from Redis (works across domains unlike cookies)
  const stored = await redis.get(`meta_oauth_state:${state}`)
  if (!stored) {
    return Response.redirect(`${base}/connect?error=invalid_state`)
  }

  const { workspaceId } = JSON.parse(stored) as { workspaceId: string; userId: string }
  await redis.del(`meta_oauth_state:${state}`)

  try {
    const tokens = await exchangeCodeForTokens(code)

    await prisma.connectedAccount.upsert({
      where: { workspaceId_provider: { workspaceId, provider: 'meta' } },
      update: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: 'ads_read,business_management',
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        provider: 'meta',
        accessToken: encrypt(tokens.accessToken),
        refreshToken: null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: 'ads_read,business_management',
      },
    })

    return Response.redirect(`${base}/connect?meta=connected`)
  } catch {
    return Response.redirect(`${base}/connect?error=token_exchange_failed`)
  }
}
