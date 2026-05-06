import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'
import { DUMMY_TOKEN } from '@/services/google/ga4'

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/business.manage',
].join(' ')

export function buildGoogleOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent', // always return refresh_token
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number // seconds
  scope: string
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Token exchange failed: ${err.error_description ?? err.error ?? res.status}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  }
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Token refresh failed: ${err.error_description ?? err.error ?? res.status}`)
  }

  const data = await res.json()
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

// Returns a valid (non-expired) access token, refreshing if needed.
export async function resolveGoogleToken(
  workspaceId: string,
  account: {
    accessToken: string
    refreshToken: string | null
    expiresAt: Date | null
  }
): Promise<string> {
  const decrypted = decrypt(account.accessToken)

  // Dummy tokens don't expire
  if (decrypted === DUMMY_TOKEN) return DUMMY_TOKEN

  // Refresh if token expires within the next 5 minutes
  const expiresAt = account.expiresAt?.getTime() ?? 0
  if (Date.now() < expiresAt - 5 * 60 * 1000) return decrypted

  if (!account.refreshToken) throw new Error('No refresh token available')

  const decryptedRefresh = decrypt(account.refreshToken)
  const refreshed = await refreshAccessToken(decryptedRefresh)

  await prisma.connectedAccount.update({
    where: { workspaceId_provider: { workspaceId, provider: 'google' } },
    data: {
      accessToken: encrypt(refreshed.accessToken),
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
    },
  })

  return refreshed.accessToken
}
