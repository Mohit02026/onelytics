const SCOPES = ['r_ads_reporting', 'r_organization_social'].join(' ')

export function buildLinkedInOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/linkedin/callback`,
    scope: SCOPES,
    state,
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

export interface LinkedInTokens {
  accessToken: string
  expiresIn: number // seconds — typically 5184000 (~60 days)
}

export async function exchangeCodeForTokens(code: string): Promise<LinkedInTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/linkedin/callback`,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`LinkedIn token exchange failed: ${data.error_description}`)
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 5184000 }
}
