import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt, encrypt } from '@/lib/encryption'
import { refreshAccessToken } from '@/services/google/auth'

async function resolveToken(workspaceId: string, account: {
  accessToken: string; refreshToken: string | null; expiresAt: Date | null
}): Promise<string> {
  const token = decrypt(account.accessToken)
  if (token === 'dummy_access_token') return token

  const expiresAt = account.expiresAt?.getTime() ?? 0
  if (Date.now() < expiresAt - 5 * 60 * 1000) return token

  if (!account.refreshToken) throw new Error('Token expired — please reconnect Google')
  const refreshed = await refreshAccessToken(decrypt(account.refreshToken))
  await prisma.connectedAccount.update({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    data: {
      accessToken: encrypt(refreshed.accessToken),
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
    },
  })
  return refreshed.accessToken
}

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const workspaceId = session.user.workspaceId
  const account = await prisma.connectedAccount.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
  })
  if (!account) return Response.json({ error: 'Google not connected' }, { status: 404 })

  let accessToken: string
  try {
    accessToken = await resolveToken(workspaceId, account)
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 401 })
  }

  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return Response.json(
      { error: (err as { error?: { message?: string } })?.error?.message ?? 'Failed to fetch Search Console sites' },
      { status: res.status }
    )
  }

  const data = await res.json() as {
    siteEntry?: Array<{ siteUrl: string; permissionLevel: string }>
  }

  const sites = (data.siteEntry ?? []).map((s) => ({
    url: s.siteUrl,
    permission: s.permissionLevel,
  }))

  return Response.json({ sites })
}
