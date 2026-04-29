import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { exchangeCodeForTokens } from '@/services/linkedin/auth'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.redirect(new URL('/login', req.url))

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const base = process.env.NEXTAUTH_URL!

  if (error) return Response.redirect(`${base}/connect?error=linkedin_denied`)

  const cookieStore = cookies()
  const storedState = cookieStore.get('linkedin_oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    return Response.redirect(`${base}/connect?error=invalid_state`)
  }
  if (!code) return Response.redirect(`${base}/connect?error=invalid_callback`)

  try {
    const tokens = await exchangeCodeForTokens(code)
    const workspaceId = session.user.workspaceId

    await prisma.connectedAccount.upsert({
      where: { workspaceId_provider: { workspaceId, provider: 'linkedin' } },
      update: {
        accessToken: encrypt(tokens.accessToken),
        refreshToken: null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: 'r_ads_reporting,r_organization_social',
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        provider: 'linkedin',
        accessToken: encrypt(tokens.accessToken),
        refreshToken: null,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        scope: 'r_ads_reporting,r_organization_social',
      },
    })

    return Response.redirect(`${base}/connect?linkedin=connected`)
  } catch {
    return Response.redirect(`${base}/connect?error=token_exchange_failed`)
  }
}
