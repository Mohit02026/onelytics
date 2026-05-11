// Diagnostic: checks what Google Ads data is available for the connected account.
// Run: node scripts/diagnose-ads.mjs
import crypto from 'crypto'
import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg
const envLines = readFileSync('D:\\Onelytics\\.env', 'utf8').split('\n')
function getEnv(key) {
  const line = envLines.find(l => l.startsWith(key + '='))
  return line ? line.split('=').slice(1).join('=').replace(/^"|"$/g, '').trim() : ''
}

const DB_URL = getEnv('DATABASE_URL')
const ENCRYPTION_KEY = getEnv('ENCRYPTION_KEY')
const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = getEnv('GOOGLE_CLIENT_SECRET')
const DEV_TOKEN = getEnv('GOOGLE_ADS_DEVELOPER_TOKEN')

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

if (!rows.length) { console.error('❌ No Google account in DB'); process.exit(1) }

const { access_token: encToken, refresh_token: encRefresh, expires_at, metadata } = rows[0]
let accessToken = decrypt(encToken)
const customerId = metadata?.googleAdsCustomerId

console.log(`👤 Customer ID : ${customerId ?? '(not set)'}`)
console.log(`🔑 Dev token   : ${DEV_TOKEN.slice(0, 8)}...`)
console.log()

if (!customerId) { console.error('❌ No customer ID saved. Set it on /connect.'); process.exit(1) }

// Refresh token if expired
const expiry = expires_at ? new Date(expires_at).getTime() : 0
if (Date.now() >= expiry - 5 * 60 * 1000) {
  console.log('🔄 Refreshing access token...')
  const refreshToken = decrypt(encRefresh)
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token' }),
  })
  const d = await r.json()
  if (!r.ok || !d.access_token) { console.error('❌ Token refresh failed:', d); process.exit(1) }
  accessToken = d.access_token
  console.log('✅ Token refreshed\n')
}

const base = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`
const headers = { Authorization: `Bearer ${accessToken}`, 'developer-token': DEV_TOKEN, 'Content-Type': 'application/json' }

async function gaql(label, query, { dump = false } = {}) {
  console.log(`📡 ${label}`)
  const res = await fetch(base, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const text = await res.text()
  if (!res.ok) {
    console.log(`   ❌ HTTP ${res.status}: ${text.slice(0, 400)}\n`)
    return []
  }
  const chunks = JSON.parse(text)
  const results = chunks.flatMap(c => c.results ?? [])
  console.log(`   ✅ ${results.length} row(s)`)
  if (dump && results.length > 0) {
    console.log('   Raw first result:', JSON.stringify(results[0], null, 2).split('\n').map(l => '   ' + l).join('\n'))
  }
  console.log()
  return results
}

const START = '2026-04-12'
const END = '2026-05-11'

// 1. Campaign types
const campaigns = await gaql('Campaign types', `
  SELECT campaign.name, campaign.advertising_channel_type, campaign.status,
         metrics.clicks, metrics.impressions, metrics.cost_micros
  FROM campaign
  WHERE segments.date BETWEEN '${START}' AND '${END}'
  ORDER BY metrics.clicks DESC LIMIT 10
`)
for (const r of campaigns) {
  const spend = (parseInt(r.metrics.cost_micros ?? '0') / 1e6).toFixed(2)
  console.log(`   • [${r.campaign.advertising_channel_type}] ${r.campaign.name} — ${r.metrics.clicks} clicks, $${spend} spend (${r.campaign.status})`)
}
console.log()

// 2. keyword_view
const keywords = await gaql('keyword_view (all statuses)', `
  SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
         ad_group_criterion.status, metrics.clicks, metrics.impressions
  FROM keyword_view
  WHERE segments.date BETWEEN '${START}' AND '${END}'
    AND campaign.status != 'REMOVED'
  ORDER BY metrics.clicks DESC LIMIT 10
`, { dump: true })
for (const r of keywords) {
  const kw = r.ad_group_criterion?.keyword
  const text = kw?.text ?? '(no keyword text — non-keyword criterion)'
  const match = kw?.match_type ?? 'N/A'
  console.log(`   • [${match}] "${text}" — ${r.metrics.clicks} clicks (status: ${r.ad_group_criterion?.status})`)
}
console.log()

// 3. search_term_view
const searchTerms = await gaql('search_term_view', `
  SELECT search_term_view.search_term, metrics.clicks, metrics.impressions, metrics.cost_micros
  FROM search_term_view
  WHERE segments.date BETWEEN '${START}' AND '${END}'
    AND campaign.status != 'REMOVED'
  ORDER BY metrics.clicks DESC LIMIT 10
`, { dump: true })
for (const r of searchTerms) {
  const spend = (parseInt(r.metrics.cost_micros ?? '0') / 1e6).toFixed(2)
  console.log(`   • "${r.search_term_view.search_term}" — ${r.metrics.clicks} clicks, $${spend} spend`)
}
console.log()

// 4. Ad groups
const adGroups = await gaql('Ad groups', `
  SELECT ad_group.name, ad_group.status, campaign.name, metrics.clicks
  FROM ad_group
  WHERE segments.date BETWEEN '${START}' AND '${END}'
    AND campaign.status != 'REMOVED'
  ORDER BY metrics.clicks DESC LIMIT 10
`)
for (const r of adGroups) {
  console.log(`   • [${r.ad_group.status}] ${r.ad_group.name} (${r.campaign.name}) — ${r.metrics.clicks} clicks`)
}
