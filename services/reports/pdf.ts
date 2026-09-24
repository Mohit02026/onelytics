import { chromium, type Browser } from 'playwright'
import type { ReportData, MoMMetric } from '@/services/reports/generate'

// One light accent per platform, reused for the section underline, tinted
// KPI tiles, and chart strokes — soft is a lighter shade of the same hue,
// used only where a platform needs a second chart color (e.g. Meta's
// placement split).
const PLATFORM_COLOR: Record<string, { main: string; tint: string; soft: string }> = {
  googleAds: { main: '#4285f4', tint: '#eef4fe', soft: '#c9defc' },
  meta: { main: '#e91e8c', tint: '#fdedf6', soft: '#f6c9e2' },
  tiktok: { main: '#14b8a6', tint: '#e6faf7', soft: '#b9f0e6' },
  linkedin: { main: '#0a66c2', tint: '#e8f1fb', soft: '#b9d7f0' },
  ga4: { main: '#ea8600', tint: '#fef3e6', soft: '#f9d8ac' },
  gsc: { main: '#7c3aed', tint: '#f4efff', soft: '#d9c8f7' },
  gbp: { main: '#4f46e5', tint: '#eeecfd', soft: '#c9c4f5' },
  wordpress: { main: '#0891b2', tint: '#e6f7fa', soft: '#aee4ed' },
}

// ─── Lazy-singleton browser ────────────────────────────────────────────────
// One Chromium process for the life of this server process — launched on
// first use, reused (a fresh Page per report, not a fresh Browser) for every
// report after that. Avoids paying a ~1-2s launch cost per report while
// avoiding the memory cost of an always-on browser from process start.
let browserPromise: Promise<Browser> | null = null
function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch().catch((err) => {
      browserPromise = null // allow retry on next call if launch failed
      throw err
    })
  }
  return browserPromise
}

// ─── Escaping — required now that HTML is hand-built, unlike react-pdf's
// JSX Text nodes which auto-escaped everything ────────────────────────────
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

const n = (v: unknown) => (typeof v === 'number' ? v : 0)
const fmt$ = (v: unknown) => '$' + n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (v: unknown) => n(v).toLocaleString('en-US')
const fmtPct = (v: unknown, decimals = 2) => `${n(v).toFixed(decimals)}%`
const fmtX = (v: unknown) => `${n(v).toFixed(2)}x`
const fmtDelta = (d: number) => `${d > 0 ? '+' : ''}${d}%`
const fmtSec = (v: unknown) => {
  const s = n(v)
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}
const fmtDate = (v: unknown) => {
  const d = new Date(String(v ?? ''))
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

// ─── Chart primitives — plain SVG strings, no charting library needed now
// that a real browser renders them ─────────────────────────────────────────
function sparkline(values: number[], color: string, w = 260, h = 74): string {
  if (values.length === 0) return ''
  const pad = 6
  const max = Math.max(...values, 0.0001)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const stepX = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0
  const pts = values.map((v, i) => ({ x: pad + i * stepX, y: pad + (h - pad * 2) * (1 - (v - min) / range) }))
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${pts[0].x},${h - pad} ${line} ${pts[pts.length - 1].x},${h - pad}`
  const last = pts[pts.length - 1]
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;">
    <polygon points="${area}" fill="${color}" opacity="0.1"></polygon>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></polyline>
    <circle cx="${last.x}" cy="${last.y}" r="4" fill="#fff"></circle>
    <circle cx="${last.x}" cy="${last.y}" r="3" fill="${color}"></circle>
  </svg>`
}

function donut(segments: { value: number; color: string }[], size = 84): string {
  const r = size / 2 - 8
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  let offset = 0
  const arcs = segments
    .map((seg) => {
      const dash = (seg.value / total) * circumference
      const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="11" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"></circle>`
      offset += dash
      return el
    })
    .join('')
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${arcs}</svg>`
}

function chartCard(title: string, value: string, chartHtml: string): string {
  return `<div class="chart-card"><div class="chead"><span class="ctitle">${esc(title)}</span><span class="cval">${esc(value)}</span></div>${chartHtml}</div>`
}

function kvTile(label: string, value: string, tint: string, accent: string): string {
  return `<div class="ptile" style="background:${tint};"><p class="plabel" style="color:${accent};">${esc(label)}</p><p class="pvalue">${esc(value)}</p></div>`
}

function table(headers: { label: string; num?: boolean }[], rows: string[][]): string {
  const th = headers.map((h) => `<th${h.num ? ' class="num"' : ''}>${esc(h.label)}</th>`).join('')
  const trs = rows
    .map((row) => `<tr>${row.map((cell, i) => `<td${headers[i]?.num ? ' class="num"' : ''}>${cell}</td>`).join('')}</tr>`)
    .join('')
  return `<table><tr>${th}</tr>${trs}</table>`
}

// ─── Per-platform section builders ─────────────────────────────────────────

function googleAdsSection(p: any, dailySpend: ReportData['dailySpend']): string {
  if (!p?.overview) return ''
  const o = p.overview
  const c = PLATFORM_COLOR.googleAds
  const spendSeries = dailySpend.map((d) => n(d.google))
  const campaigns = Array.isArray(p.campaigns) ? p.campaigns.slice(0, 10) : []
  return `
    <div class="platform-block" style="--accent:${c.main}">
      <div class="section-head"><span class="dot"></span><span class="name">Google Ads</span></div>
      ${o.source === 'ga4' ? '<p class="muted-alert">Data sourced from GA4 linked account</p>' : ''}
      <div class="ptile-row">
        ${kvTile('Spend', fmt$(o.spend), c.tint, c.main)}
        ${kvTile('Clicks', fmtN(o.clicks), c.tint, c.main)}
        ${kvTile('Conversions', fmtN(o.conversions ?? 0), c.tint, c.main)}
        ${kvTile('Cost/Conv.', o.costPerConversion ? fmt$(o.costPerConversion) : '—', c.tint, c.main)}
        ${kvTile('Phone Calls', fmtN(o.phoneCalls ?? 0), c.tint, c.main)}
        ${kvTile('ROAS', o.roas ? fmtX(o.roas) : '—', c.tint, c.main)}
      </div>
      ${spendSeries.length > 0 ? `<div class="chart-row"><div class="chart-card wide">${chartCard('Daily spend', fmt$(spendSeries[spendSeries.length - 1]), sparkline(spendSeries, c.main))}</div></div>` : ''}
      ${campaigns.length > 0 ? `<h3>Top Campaigns</h3>${table(
        [{ label: 'Campaign' }, { label: 'Type' }, { label: 'Spend', num: true }, { label: 'Clicks', num: true }, { label: 'Conv.', num: true }, { label: 'Cost/Conv.', num: true }, { label: 'ROAS', num: true }],
        campaigns.map((cp: any) => [
          esc(String(cp.name).slice(0, 40)),
          esc(String(cp.type || '').replace('_', ' ')),
          fmt$(cp.spend), fmtN(cp.clicks), n(cp.conversions).toFixed(1),
          cp.costPerConversion > 0 ? fmt$(cp.costPerConversion) : '—',
          cp.roas > 0 ? fmtX(cp.roas) : '—',
        ])
      )}` : ''}
    </div>`
}

function metaSection(p: any, dailySpend: ReportData['dailySpend']): string {
  if (!p?.overview) return ''
  const o = p.overview
  const c = PLATFORM_COLOR.meta
  const spendSeries = dailySpend.map((d) => n(d.meta))
  const campaigns = Array.isArray(p.campaigns) ? p.campaigns.slice(0, 10) : []
  const placements = Array.isArray(p.placements) ? p.placements.slice(0, 4) : []
  const placementTotal = placements.reduce((s: number, pl: any) => s + (pl.spend ?? 0), 0)
  const donutColors = [c.main, c.soft, '#fbcfe8', '#fce7f3']

  const donutBlock = placements.length > 0 ? `
    <div class="chart-card">
      <div class="chead"><span class="ctitle">Placement split</span></div>
      <div class="donut-row">
        ${donut(placements.map((pl: any, i: number) => ({ value: pl.spend ?? 0, color: donutColors[i % donutColors.length] })))}
        <div class="legend">
          ${placements.map((pl: any, i: number) => `<span class="legend-item"><span class="dot-sm" style="background:${donutColors[i % donutColors.length]};"></span>${esc(String(pl.platform ?? '').replace('_', ' '))} — ${placementTotal > 0 ? `${(((pl.spend ?? 0) / placementTotal) * 100).toFixed(1)}%` : '—'}</span>`).join('')}
        </div>
      </div>
    </div>` : ''

  return `
    <div class="platform-block" style="--accent:${c.main}">
      <div class="section-head"><span class="dot"></span><span class="name">Meta Ads</span></div>
      <div class="ptile-row">
        ${kvTile('Spend', fmt$(o.spend), c.tint, c.main)}
        ${kvTile('Reach', fmtN(o.reach), c.tint, c.main)}
        ${kvTile('Conversions', fmtN(o.conversions), c.tint, c.main)}
        ${kvTile('ROAS', o.roas ? fmtX(o.roas) : '—', c.tint, c.main)}
      </div>
      <div class="chart-row">
        ${spendSeries.length > 0 ? chartCard('Daily spend', fmt$(spendSeries[spendSeries.length - 1]), sparkline(spendSeries, c.main)) : ''}
        ${donutBlock}
      </div>
      ${campaigns.length > 0 ? `<h3>Top Campaigns</h3>${table(
        [{ label: 'Campaign' }, { label: 'Status' }, { label: 'Spend', num: true }, { label: 'Reach', num: true }, { label: 'Conv.', num: true }, { label: 'ROAS', num: true }],
        campaigns.map((cp: any) => [esc(String(cp.name).slice(0, 40)), esc(String(cp.status)), fmt$(cp.spend), fmtN(cp.reach), fmtN(cp.conversions), cp.roas ? fmtX(cp.roas) : '—'])
      )}` : ''}
    </div>`
}

function tiktokSection(p: any, dailySpend: ReportData['dailySpend']): string {
  if (!p?.overview) return ''
  const o = p.overview
  const c = PLATFORM_COLOR.tiktok
  const spendSeries = dailySpend.map((d) => n(d.tiktok))
  return `
    <div class="platform-block" style="--accent:${c.main}">
      <div class="section-head"><span class="dot"></span><span class="name">TikTok Ads</span></div>
      <div class="ptile-row">
        ${kvTile('Spend', fmt$(o.spend), c.tint, c.main)}
        ${kvTile('Reach', fmtN(o.reach), c.tint, c.main)}
        ${kvTile('Video Views', fmtN(o.videoViews), c.tint, c.main)}
        ${kvTile('Conversions', fmtN(o.conversions), c.tint, c.main)}
        ${kvTile('ROAS', o.roas ? fmtX(o.roas) : '—', c.tint, c.main)}
      </div>
      ${spendSeries.some((v) => v > 0) ? `<div class="chart-row"><div class="chart-card wide">${chartCard('Daily spend', fmt$(spendSeries[spendSeries.length - 1]), sparkline(spendSeries, c.main))}</div></div>` : ''}
    </div>`
}

function linkedinSection(p: any, dailySpend: ReportData['dailySpend']): string {
  if (!p?.overview) return ''
  const o = p.overview
  const c = PLATFORM_COLOR.linkedin
  const spendSeries = dailySpend.map((d) => n(d.linkedin))
  return `
    <div class="platform-block" style="--accent:${c.main}">
      <div class="section-head"><span class="dot"></span><span class="name">LinkedIn Ads</span></div>
      <div class="ptile-row">
        ${kvTile('Spend', fmt$(o.spend), c.tint, c.main)}
        ${kvTile('Impressions', fmtN(o.impressions), c.tint, c.main)}
        ${kvTile('Eng. Rate', fmtPct(o.engagementRate), c.tint, c.main)}
        ${kvTile('Conversions', fmtN(o.conversions), c.tint, c.main)}
        ${kvTile('Leads', fmtN(o.leads ?? 0), c.tint, c.main)}
      </div>
      ${spendSeries.some((v) => v > 0) ? `<div class="chart-row"><div class="chart-card wide">${chartCard('Daily spend', fmt$(spendSeries[spendSeries.length - 1]), sparkline(spendSeries, c.main))}</div></div>` : ''}
    </div>`
}

function ga4Section(p: any): string {
  if (!p?.overview) return ''
  const o = p.overview
  const c = PLATFORM_COLOR.ga4
  const topPages = Array.isArray(p.topPages) ? p.topPages.slice(0, 8) : []
  return `
    <div class="platform-block" style="--accent:${c.main}">
      <div class="section-head"><span class="dot"></span><span class="name">Google Analytics (GA4)</span></div>
      <div class="ptile-row">
        ${kvTile('Sessions', fmtN(o.sessions), c.tint, c.main)}
        ${kvTile('Users', fmtN(o.users), c.tint, c.main)}
        ${kvTile('Bounce Rate', fmtPct(o.bounceRate, 1), c.tint, c.main)}
        ${kvTile('Avg. Session', fmtSec(o.avgSessionDuration), c.tint, c.main)}
      </div>
      ${topPages.length > 0 ? `<h3>Top Pages</h3>${table(
        [{ label: 'Page' }, { label: 'Pageviews', num: true }, { label: 'Avg Time', num: true }],
        topPages.map((pg: any) => [esc(String(pg.page).slice(0, 70)), fmtN(pg.pageviews), fmtSec(pg.avgTimeOnPage)])
      )}` : ''}
    </div>`
}

function gscSection(p: any): string {
  if (!p?.overview) return ''
  const o = p.overview
  const c = PLATFORM_COLOR.gsc
  const keywords = Array.isArray(p.keywords) ? p.keywords.slice(0, 10) : []
  return `
    <div class="platform-block" style="--accent:${c.main}">
      <div class="section-head"><span class="dot"></span><span class="name">Google Search Console</span></div>
      <div class="ptile-row">
        ${kvTile('Clicks', fmtN(o.clicks), c.tint, c.main)}
        ${kvTile('Impressions', fmtN(o.impressions), c.tint, c.main)}
        ${kvTile('Avg. Position', n(o.position).toFixed(1), c.tint, c.main)}
      </div>
      ${keywords.length > 0 ? `<h3>Top Keywords</h3>${table(
        [{ label: 'Keyword' }, { label: 'Clicks', num: true }, { label: 'Impr.', num: true }, { label: 'Position', num: true }],
        keywords.map((k: any) => [esc(String(k.query)), fmtN(k.clicks), fmtN(k.impressions), n(k.position).toFixed(1) + (k.positionChange ? ` (${fmtDelta(-k.positionChange)})` : '')])
      )}` : ''}
    </div>`
}

function gbpSection(p: any): string {
  if (!p?.overview) return ''
  const o = p.overview
  const c = PLATFORM_COLOR.gbp
  const reviews = Array.isArray(p.reviews) ? p.reviews.slice(0, 6) : []
  const posts = Array.isArray(p.posts) ? p.posts.slice(0, 6) : []
  return `
    <div class="platform-block" style="--accent:${c.main}">
      <div class="section-head"><span class="dot"></span><span class="name">Google Business Profile</span></div>
      <div class="ptile-row">
        ${kvTile('Total Views', fmtN(o.totalViews ?? 0), c.tint, c.main)}
        ${kvTile('Calls', fmtN(o.calls ?? 0), c.tint, c.main)}
        ${kvTile('Directions', fmtN(o.directionRequests ?? 0), c.tint, c.main)}
        ${kvTile('Website Clicks', fmtN(o.websiteClicks ?? 0), c.tint, c.main)}
        ${kvTile('Avg Rating', o.avgRating ? n(o.avgRating).toFixed(1) : '—', c.tint, c.main)}
        ${kvTile('Total Reviews', fmtN(o.totalReviews ?? 0), c.tint, c.main)}
      </div>
      ${reviews.length > 0 ? `<h3>Recent Reviews</h3>${table(
        [{ label: 'Date' }, { label: 'Reviewer' }, { label: 'Review' }, { label: 'Rating', num: true }],
        reviews.map((r: any) => [fmtDate(r.createTime), esc(String(r.reviewer || 'Anonymous').slice(0, 24)), esc(String(r.comment || '—').slice(0, 70)), `${r.rating ?? 0}/5`])
      )}` : ''}
      ${posts.length > 0 ? `<h3>Recent Posts</h3>${table(
        [{ label: 'Date' }, { label: 'Summary' }, { label: 'State' }],
        posts.map((post: any) => [fmtDate(post.createTime), esc(String(post.summary || '—').slice(0, 90)), esc(String(post.state || '—'))])
      )}` : ''}
    </div>`
}

function wordpressSection(p: any): string {
  if (!p?.overview) return ''
  const o = p.overview
  const c = PLATFORM_COLOR.wordpress
  return `
    <div class="platform-block" style="--accent:${c.main}">
      <div class="section-head"><span class="dot"></span><span class="name">WordPress Content</span></div>
      <div class="ptile-row">
        ${kvTile('Published Posts', fmtN(o.published), c.tint, c.main)}
        ${kvTile('Scheduled Posts', fmtN(o.scheduled), c.tint, c.main)}
        ${kvTile('Total Comments', fmtN(o.totalComments), c.tint, c.main)}
      </div>
    </div>`
}

const STYLE = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; font-variant-numeric: tabular-nums; -webkit-font-smoothing: antialiased; }
  .page { padding: 44px 48px; min-height: 100vh; break-after: page; position: relative; }
  .page:last-child { break-after: auto; }
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100vh; background: linear-gradient(180deg, #fbfcff 0%, #f3f6fd 100%); }
  .cover .brand { font-size: 13px; font-weight: 700; color: #2563eb; letter-spacing: 0.16em; margin-bottom: 110px; }
  .cover h1 { font-size: 30px; font-weight: 700; margin: 0 0 12px; max-width: 480px; letter-spacing: -0.01em; }
  .cover .sub { color: #6b7280; font-size: 14px; margin: 0 0 4px; }
  .cover .date { color: #9ca3af; font-size: 11.5px; font-style: italic; margin-top: 34px; }
  .eyebrow { font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; margin: 0 0 4px; }
  h2.title { font-size: 20px; font-weight: 700; margin: 0 0 22px; letter-spacing: -0.01em; }
  h3 { font-size: 13px; font-weight: 700; margin: 22px 0 11px; color: #1f2937; }
  .kv-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .kv { background: #f8faff; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(16,24,40,0.04); }
  .kv-label { font-size: 10px; color: #64748b; margin: 0 0 6px; font-weight: 600; letter-spacing: 0.01em; }
  .kv-value { font-size: 19px; font-weight: 700; margin: 0; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5px; }
  th { text-align: left; padding: 8px 10px; font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; border-bottom: 1.5px solid #e2e8f0; }
  td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; color: #1f2937; }
  tr:last-child td { border-bottom: none; }
  td.num, th.num { text-align: right; }
  td.delta-up { color: #16a34a; font-weight: 700; }
  td.delta-down { color: #dc2626; font-weight: 700; }
  .muted-alert { font-size: 10px; color: #94a3b8; font-style: italic; margin: -8px 0 12px; }
  .platform-block { margin-bottom: 30px; break-inside: avoid; }
  .section-head { display: flex; align-items: center; gap: 9px; padding: 9px 4px; margin-bottom: 14px; border-bottom: 2px solid var(--accent); }
  .section-head .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
  .section-head .name { font-size: 14.5px; font-weight: 700; color: #111827; }
  .ptile-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .ptile { border-radius: 8px; padding: 10px 11px; }
  .plabel { font-size: 9.5px; margin: 0 0 5px; font-weight: 600; }
  .pvalue { font-size: 15px; font-weight: 700; margin: 0; color: #0f172a; }
  .chart-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; margin-bottom: 16px; }
  .chart-card { border: 1px solid #eef0f3; border-radius: 10px; padding: 13px 15px 10px; }
  .chart-card.wide { grid-column: 1 / -1; }
  .chead { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .ctitle { font-size: 10.5px; color: #64748b; }
  .cval { font-size: 14px; font-weight: 700; color: #0f172a; }
  .donut-row { display: flex; align-items: center; gap: 16px; }
  .legend { display: flex; flex-direction: column; gap: 6px; }
  .legend-item { font-size: 9.5px; color: #475569; display: flex; align-items: center; gap: 6px; }
  .dot-sm { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  .footer { position: absolute; bottom: 20px; left: 48px; right: 48px; text-align: center; color: #cbd5e1; font-size: 8px; }
`

function buildReportHtml(data: ReportData, title: string, startDate: string, endDate: string, createdAt: Date): string {
  const s = data.executiveSummary
  const p = data.platforms ?? {}
  const generated = createdAt.toLocaleDateString()

  const adsSections = [
    googleAdsSection(p.googleAds, data.dailySpend),
    metaSection(p.meta, data.dailySpend),
    tiktokSection(p.tiktok, data.dailySpend),
    linkedinSection(p.linkedin, data.dailySpend),
  ].filter(Boolean)

  const organicSections = [ga4Section(p.ga4), gscSection(p.gsc), gbpSection(p.gbp), wordpressSection(p.wordpress)].filter(Boolean)

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${STYLE}</style></head><body>

  <div class="page cover">
    <div class="brand">ONELYTICS</div>
    <h1>${esc(title)}</h1>
    <p class="sub">${esc(startDate)} – ${esc(endDate)}</p>
    <p class="date">Generated ${esc(generated)}</p>
  </div>

  <div class="page">
    <p class="eyebrow">Overview</p>
    <h2 class="title">Executive Summary</h2>
    <div class="kv-row">
      <div class="kv"><p class="kv-label">Total Ad Spend</p><p class="kv-value">${fmt$(s.totalSpend)}</p></div>
      <div class="kv"><p class="kv-label">Total Conversions</p><p class="kv-value">${fmtN(s.totalConversions)}</p></div>
      <div class="kv"><p class="kv-label">Average CPA</p><p class="kv-value">${fmt$(s.avgCpa)}</p></div>
      <div class="kv"><p class="kv-label">Total Impressions</p><p class="kv-value">${fmtN(s.totalImpressions)}</p></div>
      <div class="kv"><p class="kv-label">Total Clicks</p><p class="kv-value">${fmtN(s.totalClicks)}</p></div>
      <div class="kv"><p class="kv-label">Average CTR</p><p class="kv-value">${fmtPct(s.avgCtr)}</p></div>
    </div>

    <h3>Period-over-Period Comparison</h3>
    ${table(
      [{ label: 'Metric' }, { label: 'Current', num: true }, { label: 'Previous', num: true }, { label: 'Change', num: true }],
      data.momComparisons.map((m: MoMMetric) => {
        const fmtVal = (v: number) => (m.format === 'money' ? fmt$(v) : m.format === 'pct' ? fmtPct(v) : fmtN(v))
        return [esc(m.label), fmtVal(m.current), fmtVal(m.previous), `<span class="${m.delta > 0 ? 'delta-up' : m.delta < 0 ? 'delta-down' : ''}">${fmtDelta(m.delta)}</span>`]
      })
    )}

    ${data.channels.length > 0 ? `<h3>Channel Performance</h3>${table(
      [{ label: 'Channel' }, { label: 'Spend', num: true }, { label: 'Share', num: true }, { label: 'Conv.', num: true }, { label: 'ROAS', num: true }],
      [
        ...data.channels.map((c) => [
          esc(c.channel), fmt$(c.spend),
          s.totalSpend > 0 ? `${((c.spend / s.totalSpend) * 100).toFixed(1)}%` : '—',
          fmtN(c.conversions), c.roas ? fmtX(c.roas) : '—',
        ]),
        [`<strong>Total</strong>`, `<strong>${fmt$(s.totalSpend)}</strong>`, '100%', fmtN(s.totalConversions), '—'],
      ]
    )}` : ''}
    <div class="footer">Onelytics · Generated ${esc(generated)}</div>
  </div>

  ${adsSections.length > 0 ? `
  <div class="page">
    <p class="eyebrow">Platform Detail</p>
    <h2 class="title">Performance by Platform</h2>
    ${adsSections.join('')}
    <div class="footer">Onelytics · Generated ${esc(generated)}</div>
  </div>` : ''}

  ${organicSections.length > 0 ? `
  <div class="page">
    <p class="eyebrow">Organic &amp; Local</p>
    <h2 class="title">SEO &amp; Local Presence</h2>
    ${organicSections.join('')}
    <div class="footer">Onelytics · Generated ${esc(generated)}</div>
  </div>` : ''}

</body></html>`
}

export async function generatePdf(data: ReportData, title: string, startDate: string, endDate: string, createdAt: Date): Promise<Buffer> {
  const html = buildReportHtml(data, title, startDate, endDate, createdAt)
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle' })
    return await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } })
  } finally {
    await page.close()
  }
}
