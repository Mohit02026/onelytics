// Quick test: verifies the Google Ads developer token against the real API.
// Run: node scripts/test-ads-token.mjs [new-dev-token]
// If no token arg, reads GOOGLE_ADS_DEVELOPER_TOKEN from .env
import crypto from 'crypto'
import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg

// Parse .env manually
const envLines = readFileSync('D:\\Onelytics\\.env', 'utf8').split('\n')
function getEnv(key) {
  const line = envLines.find(l => l.startsWith(key + '='))
  return line ? line.split('=').slice(1).join('=').replace(/^"|"$/g, '').trim() : ''
}

const DB_URL = getEnv('DATABASE_URL')
const ENCRYPTION_KEY = getEnv('ENCRYPTION_KEY')
const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = getEnv('GOOGLE_CLIENT_SECRET')
// Accept new token as CLI arg, fall back to .env
const DEV_TOKEN = process.argv[2] || getEnv('GOOGLE_ADS_DEVELOPER_TOKEN')

function decrypt(encoded) {
  const [ivHex, tagHex, encryptedHex] = encoded.split(':')
  const key = Buffer.from(ENCRYPTION_KEY, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

const client = new Client({ connectionString: DB_URL })
await client.connect()

const { rows } = await client.query(
  `SELECT access_token, refresh_token, expires_at, metadata FROM connected_accounts WHERE provider = 'google' LIMIT 1`
)
await client.end()

if (!rows.length) {
  console.error('❌  No Google account found in DB. Connect Google first.')
  process.exit(1)
}

const { access_token: encToken, refresh_token: encRefresh, expires_at, metadata } = rows[0]
let accessToken = decrypt(encToken)
const customerId = metadata?.googleAdsCustomerId

// Refresh the access token if expired
const expiry = expires_at ? new Date(expires_at).getTime() : 0
if (Date.now() >= expiry - 5 * 60 * 1000) {
  console.log('🔄  Access token expired — refreshing...')
  if (!encRefresh) { console.error('❌  No refresh token stored.'); process.exit(1) }
  const refreshToken = decrypt(encRefresh)
  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  const refreshData = await refreshRes.json()
  if (!refreshRes.ok || !refreshData.access_token) {
    console.error('❌  Token refresh failed:', JSON.stringify(refreshData))
    process.exit(1)
  }
  accessToken = refreshData.access_token
  console.log('✅  Token refreshed.')
}

if (!customerId) {
  console.error('❌  No Google Ads customer ID saved. Set it on /connect.')
  process.exit(1)
}

console.log(`🔑  Developer token : ${DEV_TOKEN}`)
console.log(`👤  Customer ID     : ${customerId}`)
console.log(`🔓  Access token    : ${accessToken.slice(0, 20)}...`)
console.log()
console.log('📡  Calling Google Ads API v19 searchStream...')

const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`
const query = `
  SELECT campaign.name, metrics.cost_micros, metrics.clicks
  FROM campaign
  WHERE segments.date DURING LAST_30_DAYS
    AND campaign.status = 'ENABLED'
  ORDER BY metrics.cost_micros DESC
  LIMIT 5
`

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': DEV_TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
})

const text = await res.text()

if (!res.ok) {
  console.error(`❌  API error ${res.status}:`)
  console.error(text.slice(0, 1000))
  process.exit(1)
}

const chunks = JSON.parse(text)
const results = chunks.flatMap(c => c.results ?? [])

if (results.length === 0) {
  console.log('⚠️   API call succeeded but returned 0 campaigns (no active spend in last 30 days).')
} else {
  console.log(`✅  Success! ${results.length} campaign(s) returned:`)
  for (const r of results) {
    const spend = ((parseInt(r.metrics.cost_micros ?? '0', 10) || 0) / 1_000_000).toFixed(2)
    console.log(`   • ${r.campaign.name} — $${spend} spend, ${r.metrics.clicks ?? 0} clicks`)
  }
}
