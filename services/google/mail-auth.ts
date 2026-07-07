import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'

// openid+email are the basic, unverified-exempt scopes — used only to read the
// connected address back for display ("Sending as x@gmail.com"). gmail.send is
// the one sensitive scope this flow needs; deliberately not requesting
// gmail.readonly/gmail.modify, which would pull this into the CASA review tier.
const MAIL_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/gmail.send'].join(' ')

function redirectUri(): string {
  return `${process.env.NEXTAUTH_URL}/api/integrations/google-mail/callback`
}

export function buildMailOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: MAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export interface MailTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  scope: string
  emailAddress: string
}

function decodeEmailFromIdToken(idToken: string): string {
  const payload = idToken.split('.')[1]
  const json = Buffer.from(payload, 'base64').toString('utf8')
  const { email } = JSON.parse(json) as { email?: string }
  if (!email) throw new Error('id_token has no email claim')
  return email.toLowerCase()
}

export async function exchangeMailCodeForTokens(code: string): Promise<MailTokens> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Mail token exchange failed: ${err.error_description ?? err.error ?? res.status}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    emailAddress: decodeEmailFromIdToken(data.id_token),
  }
}

export async function refreshMailAccessToken(
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
    throw new Error(`Mail token refresh failed: ${err.error_description ?? err.error ?? res.status}`)
  }

  const data = await res.json()
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

// Returns a valid (non-expired) access token for the user's connected mailbox,
// refreshing if needed. Throws if not connected — callers decide how to surface that.
export async function resolveMailAccessToken(userId: string): Promise<string> {
  const mailbox = await prisma.connectedMailbox.findUnique({
    where: { userId_provider: { userId, provider: 'google' } },
  })
  if (!mailbox) throw new Error('No connected mailbox for this user')

  const expiresAt = mailbox.expiresAt?.getTime() ?? 0
  if (Date.now() < expiresAt - 5 * 60 * 1000) return decrypt(mailbox.accessToken)

  if (!mailbox.refreshToken) throw new Error('No refresh token available — reconnect required')

  const refreshed = await refreshMailAccessToken(decrypt(mailbox.refreshToken))

  await prisma.connectedMailbox.update({
    where: { userId_provider: { userId, provider: 'google' } },
    data: {
      accessToken: encrypt(refreshed.accessToken),
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
    },
  })

  return refreshed.accessToken
}
