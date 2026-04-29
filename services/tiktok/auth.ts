const API_VERSION = 'v1.3'

export function buildTikTokOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    app_id: process.env.TIKTOK_APP_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/tiktok/callback`,
    response_type: 'code',
    scope: 'ad.read',
    state,
  })
  return `https://business-api.tiktok.com/portal/auth?${params}`
}

export interface TikTokTokens {
  accessToken: string
  expiresIn: number // seconds — typically 86400 (24h), refresh available
  refreshToken: string
  refreshExpiresIn: number
}

export async function exchangeCodeForTokens(code: string): Promise<TikTokTokens> {
  const res = await fetch(`https://business-api.tiktok.com/open_api/${API_VERSION}/oauth2/access_token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.TIKTOK_APP_ID!,
      secret: process.env.TIKTOK_APP_SECRET!,
      auth_code: code,
    }),
  })
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`TikTok token exchange failed: ${data.message}`)
  const d = data.data
  return {
    accessToken: d.access_token,
    expiresIn: d.expires_in ?? 86400,
    refreshToken: d.refresh_token,
    refreshExpiresIn: d.refresh_token_expires_in ?? 31536000,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TikTokTokens> {
  const res = await fetch(`https://business-api.tiktok.com/open_api/${API_VERSION}/oauth2/refresh_token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.TIKTOK_APP_ID!,
      secret: process.env.TIKTOK_APP_SECRET!,
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`TikTok token refresh failed: ${res.status}`)
  const data = await res.json()
  if (data.code !== 0) throw new Error(`TikTok token refresh failed: ${data.message}`)
  const d = data.data
  return {
    accessToken: d.access_token,
    expiresIn: d.expires_in ?? 86400,
    refreshToken: d.refresh_token,
    refreshExpiresIn: d.refresh_token_expires_in ?? 31536000,
  }
}
