const SCOPES = ['ads_read', 'business_management'].join(',')
const GRAPH_VERSION = 'v22.0'

export function buildMetaOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_REDIRECT_URI ?? `${process.env.NEXTAUTH_URL}/api/integrations/meta/callback`,
    response_type: 'code',
    scope: SCOPES,
    state,
  })
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`
}

export interface MetaTokens {
  accessToken: string
  expiresIn: number // seconds — typically 5183944 (~60 days)
}

export async function exchangeCodeForTokens(code: string): Promise<MetaTokens> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: process.env.META_REDIRECT_URI ?? `${process.env.NEXTAUTH_URL}/api/integrations/meta/callback`,
    code,
  })
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${params}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Meta token exchange failed: ${(err as { error?: { message?: string } }).error?.message ?? res.status}`)
  }
  const data = await res.json()
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 5183944 }
}
