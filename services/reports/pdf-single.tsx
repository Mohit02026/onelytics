import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

const C = {
  primary: '#2563eb',
  textHeading: '#111827',
  textMuted: '#6b7280',
  textWhite: '#ffffff',
  bgHeader: '#1E3A5F',
  bgAlt: '#f3f4f6',
  border: '#e5e7eb',
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: C.textHeading },
  coverBrand: { fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: C.primary, marginTop: 130 },
  coverTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 16, color: C.textHeading },
  coverSubtitle: { fontSize: 13, textAlign: 'center', color: C.textMuted, marginTop: 14 },
  coverDate: { fontSize: 11, textAlign: 'center', color: C.textMuted, marginTop: 30, fontStyle: 'italic' },
  h2: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.textHeading, marginTop: 20, marginBottom: 10 },
  h3: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.textHeading, marginTop: 14, marginBottom: 6 },
  sectionHeader: { backgroundColor: C.bgHeader, padding: 8, marginTop: 20, marginBottom: 10 },
  sectionHeaderText: { color: C.textWhite, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  table: { width: '100%', border: `1px solid ${C.border}`, borderBottom: 0, marginTop: 8, marginBottom: 16 },
  trHeader: { flexDirection: 'row', backgroundColor: C.bgHeader },
  tr: { flexDirection: 'row', borderBottom: `1px solid ${C.border}` },
  trAlt: { flexDirection: 'row', backgroundColor: C.bgAlt, borderBottom: `1px solid ${C.border}` },
  th: { padding: 6, color: C.textWhite, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  td: { padding: 6, fontSize: 9, color: C.textHeading },
  kvTable: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 16 },
  kvBox: { width: '31%', padding: 10, border: `1px solid ${C.border}`, backgroundColor: '#ffffff', marginRight: '2%', marginBottom: 10, borderRadius: 4 },
  kvLabel: { fontSize: 9, color: C.textMuted, marginBottom: 4 },
  kvValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.textHeading },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: C.textMuted, fontSize: 8 },
  mutedAlert: { fontSize: 10, color: C.textMuted, fontStyle: 'italic', marginBottom: 8 },
  badge: { fontSize: 8, color: C.primary, fontFamily: 'Helvetica-Bold' },
})

const n = (v: unknown) => (typeof v === 'number' ? v : 0)
const fmt$ = (v: unknown) => '$' + n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtN = (v: unknown) => n(v).toLocaleString('en-US')
const fmtPct = (v: unknown, d = 2) => `${n(v).toFixed(d)}%`
const fmtX = (v: unknown) => `${n(v).toFixed(2)}x`
const fmtSec = (v: unknown) => { const s = n(v); const m = Math.floor(s / 60); return m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s` }

const KvBox = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.kvBox}>
    <Text style={styles.kvLabel}>{label}</Text>
    <Text style={styles.kvValue}>{value}</Text>
  </View>
)

const TableHeader = ({ cols }: { cols: { label: string; w: string }[] }) => (
  <View style={styles.trHeader}>
    {cols.map((c, i) => <Text key={i} style={[styles.th, { width: c.w }]}>{c.label}</Text>)}
  </View>
)

const TableRow = ({ row, cols, alt }: { row: string[]; cols: { w: string }[]; alt: boolean }) => (
  <View style={alt ? styles.trAlt : styles.tr}>
    {row.map((val, i) => <Text key={i} style={[styles.td, { width: cols[i].w }]}>{val}</Text>)}
  </View>
)

const DataTable = ({ headers, rows }: { headers: { label: string; w: string }[]; rows: string[][] }) => (
  <View style={styles.table}>
    <TableHeader cols={headers} />
    {rows.map((row, i) => <TableRow key={i} row={row} cols={headers} alt={i % 2 === 1} />)}
  </View>
)

// --- Platform-specific sections ---

function GoogleAdsSection({ d }: { d: Record<string, unknown> }) {
  const o = (d.overview ?? {}) as Record<string, unknown>
  const campaigns = (d.campaigns ?? []) as Array<Record<string, unknown>>
  const keywords = (d.keywords ?? []) as Array<Record<string, unknown>>
  return (
    <View>
      {d.source === 'ga4' ? <Text style={styles.mutedAlert}>⚠ Data sourced from GA4 linked account</Text> : null}
      <View style={styles.kvTable}>
        <KvBox label="Ad Spend" value={fmt$(o.spend)} />
        <KvBox label="Clicks" value={fmtN(o.clicks)} />
        <KvBox label="Impressions" value={fmtN(o.impressions)} />
        <KvBox label="CPC" value={fmt$(o.cpc)} />
        <KvBox label="Conversions" value={fmtN(o.conversions)} />
        <KvBox label="ROAS" value={o.roas ? fmtX(o.roas) : '—'} />
      </View>
      {campaigns.length > 0 ? (
        <>
          <Text style={styles.h3}>Campaigns</Text>
          <DataTable
            headers={[
              { label: 'Campaign', w: '38%' },
              { label: 'Spend', w: '12%' },
              { label: 'Clicks', w: '12%' },
              { label: 'Impr.', w: '12%' },
              { label: 'CPC', w: '12%' },
              { label: 'ROAS', w: '14%' },
            ]}
            rows={campaigns.slice(0, 20).map((c) => [
              String(c.name ?? '').slice(0, 38), fmt$(c.spend), fmtN(c.clicks), fmtN(c.impressions), fmt$(c.cpc), c.roas ? fmtX(c.roas) : '—',
            ])}
          />
        </>
      ) : null}
      {keywords.length > 0 ? (
        <>
          <Text style={styles.h3}>Top Keywords</Text>
          <DataTable
            headers={[
              { label: 'Keyword', w: '38%' },
              { label: 'Match', w: '12%' },
              { label: 'Clicks', w: '12%' },
              { label: 'Impr.', w: '12%' },
              { label: 'CPC', w: '12%' },
              { label: 'Conv.', w: '14%' },
            ]}
            rows={keywords.slice(0, 20).map((k) => [
              String(k.keyword ?? '').slice(0, 38), String(k.matchType ?? '').slice(0, 10),
              fmtN(k.clicks), fmtN(k.impressions), fmt$(k.cpc), fmtN(k.conversions),
            ])}
          />
        </>
      ) : null}
    </View>
  )
}

function MetaSection({ d }: { d: Record<string, unknown> }) {
  const o = (d.overview ?? {}) as Record<string, unknown>
  const campaigns = (d.campaigns ?? []) as Array<Record<string, unknown>>
  return (
    <View>
      <View style={styles.kvTable}>
        <KvBox label="Ad Spend" value={fmt$(o.spend)} />
        <KvBox label="Reach" value={fmtN(o.reach)} />
        <KvBox label="Impressions" value={fmtN(o.impressions)} />
        <KvBox label="Clicks" value={fmtN(o.clicks)} />
        <KvBox label="Conversions" value={fmtN(o.conversions)} />
        <KvBox label="ROAS" value={o.roas ? fmtX(o.roas) : '—'} />
      </View>
      {campaigns.length > 0 ? (
        <>
          <Text style={styles.h3}>Campaigns</Text>
          <DataTable
            headers={[
              { label: 'Campaign', w: '33%' },
              { label: 'Status', w: '12%' },
              { label: 'Spend', w: '11%' },
              { label: 'Reach', w: '11%' },
              { label: 'Impr.', w: '11%' },
              { label: 'Clicks', w: '11%' },
              { label: 'Conv.', w: '11%' },
            ]}
            rows={campaigns.slice(0, 20).map((c) => [
              String(c.name ?? '').slice(0, 33), String(c.status ?? ''),
              fmt$(c.spend), fmtN(c.reach), fmtN(c.impressions), fmtN(c.clicks), fmtN(c.conversions),
            ])}
          />
        </>
      ) : null}
    </View>
  )
}

function TikTokSection({ d }: { d: Record<string, unknown> }) {
  const o = (d.overview ?? {}) as Record<string, unknown>
  const campaigns = (d.campaigns ?? []) as Array<Record<string, unknown>>
  return (
    <View>
      <View style={styles.kvTable}>
        <KvBox label="Ad Spend" value={fmt$(o.spend)} />
        <KvBox label="Reach" value={fmtN(o.reach)} />
        <KvBox label="Video Views" value={fmtN(o.videoViews)} />
        <KvBox label="Clicks" value={fmtN(o.clicks)} />
        <KvBox label="Conversions" value={fmtN(o.conversions)} />
        <KvBox label="ROAS" value={o.roas ? fmtX(o.roas) : '—'} />
      </View>
      {campaigns.length > 0 ? (
        <>
          <Text style={styles.h3}>Campaigns</Text>
          <DataTable
            headers={[
              { label: 'Campaign', w: '35%' },
              { label: 'Spend', w: '13%' },
              { label: 'Reach', w: '13%' },
              { label: 'Views', w: '13%' },
              { label: 'Clicks', w: '13%' },
              { label: 'Conv.', w: '13%' },
            ]}
            rows={campaigns.slice(0, 20).map((c) => [
              String(c.name ?? '').slice(0, 35), fmt$(c.spend), fmtN(c.reach), fmtN(c.videoViews), fmtN(c.clicks), fmtN(c.conversions),
            ])}
          />
        </>
      ) : null}
    </View>
  )
}

function LinkedInSection({ d }: { d: Record<string, unknown> }) {
  const o = (d.overview ?? {}) as Record<string, unknown>
  const campaigns = (d.campaigns ?? []) as Array<Record<string, unknown>>
  return (
    <View>
      <View style={styles.kvTable}>
        <KvBox label="Ad Spend" value={fmt$(o.spend)} />
        <KvBox label="Impressions" value={fmtN(o.impressions)} />
        <KvBox label="Clicks" value={fmtN(o.clicks)} />
        <KvBox label="Eng. Rate" value={fmtPct(o.engagementRate)} />
        <KvBox label="Conversions" value={fmtN(o.conversions)} />
        <KvBox label="Leads" value={fmtN(o.leads ?? 0)} />
      </View>
      {campaigns.length > 0 ? (
        <>
          <Text style={styles.h3}>Campaigns</Text>
          <DataTable
            headers={[
              { label: 'Campaign', w: '35%' },
              { label: 'Spend', w: '13%' },
              { label: 'Impr.', w: '13%' },
              { label: 'Clicks', w: '13%' },
              { label: 'CTR', w: '13%' },
              { label: 'Conv.', w: '13%' },
            ]}
            rows={campaigns.slice(0, 20).map((c) => [
              String(c.name ?? '').slice(0, 35), fmt$(c.spend), fmtN(c.impressions), fmtN(c.clicks), fmtPct(c.ctr), fmtN(c.conversions),
            ])}
          />
        </>
      ) : null}
    </View>
  )
}

function GA4Section({ d }: { d: Record<string, unknown> }) {
  const o = (d.overview ?? {}) as Record<string, unknown>
  const topPages = (d.topPages ?? []) as Array<Record<string, unknown>>
  return (
    <View>
      <View style={styles.kvTable}>
        <KvBox label="Sessions" value={fmtN(o.sessions)} />
        <KvBox label="Users" value={fmtN(o.users)} />
        <KvBox label="Pageviews" value={fmtN(o.pageviews)} />
        <KvBox label="New Users" value={fmtN(o.newUsers)} />
        <KvBox label="Bounce Rate" value={fmtPct(o.bounceRate)} />
        <KvBox label="Avg Session" value={fmtSec(o.avgSessionDuration)} />
      </View>
      {topPages.length > 0 ? (
        <>
          <Text style={styles.h3}>Top Pages</Text>
          <DataTable
            headers={[
              { label: 'Page', w: '60%' },
              { label: 'Pageviews', w: '20%' },
              { label: 'Avg Time', w: '20%' },
            ]}
            rows={topPages.slice(0, 20).map((p) => [
              String(p.page ?? '').slice(0, 60), fmtN(p.pageviews), fmtSec(p.avgTimeOnPage),
            ])}
          />
        </>
      ) : null}
    </View>
  )
}

function GscSection({ d }: { d: Record<string, unknown> }) {
  const o = (d.overview ?? {}) as Record<string, unknown>
  const keywords = (d.keywords ?? []) as Array<Record<string, unknown>>
  const topPages = (d.topPages ?? []) as Array<Record<string, unknown>>
  return (
    <View>
      <View style={styles.kvTable}>
        <KvBox label="Total Clicks" value={fmtN(o.clicks)} />
        <KvBox label="Impressions" value={fmtN(o.impressions)} />
        <KvBox label="CTR" value={fmtPct(o.ctr)} />
        <KvBox label="Avg. Position" value={n(o.position).toFixed(1)} />
      </View>
      {keywords.length > 0 ? (
        <>
          <Text style={styles.h3}>Top Keywords</Text>
          <DataTable
            headers={[
              { label: 'Keyword', w: '45%' },
              { label: 'Clicks', w: '14%' },
              { label: 'Impr.', w: '14%' },
              { label: 'CTR', w: '13%' },
              { label: 'Position', w: '14%' },
            ]}
            rows={keywords.slice(0, 20).map((k) => [
              String(k.keyword ?? '').slice(0, 45), fmtN(k.clicks), fmtN(k.impressions),
              fmtPct(k.ctr), n(k.position).toFixed(1),
            ])}
          />
        </>
      ) : null}
      {topPages.length > 0 ? (
        <>
          <Text style={styles.h3}>Top Pages</Text>
          <DataTable
            headers={[
              { label: 'Page', w: '50%' },
              { label: 'Clicks', w: '15%' },
              { label: 'Impr.', w: '15%' },
              { label: 'Position', w: '20%' },
            ]}
            rows={topPages.slice(0, 15).map((p) => [
              String(p.page ?? '').slice(0, 50), fmtN(p.clicks), fmtN(p.impressions), n(p.position).toFixed(1),
            ])}
          />
        </>
      ) : null}
    </View>
  )
}

function GbpSection({ d }: { d: Record<string, unknown> }) {
  const o = (d.overview ?? {}) as Record<string, unknown>
  return (
    <View>
      <View style={styles.kvTable}>
        <KvBox label="Profile Views" value={fmtN(o.views ?? o.totalViews)} />
        <KvBox label="Website Clicks" value={fmtN(o.websiteClicks)} />
        <KvBox label="Calls" value={fmtN(o.calls)} />
        <KvBox label="Directions" value={fmtN(o.directions)} />
        <KvBox label="Messages" value={fmtN(o.messages)} />
        <KvBox label="Bookings" value={fmtN(o.bookings)} />
      </View>
    </View>
  )
}

function WordPressSection({ d }: { d: Record<string, unknown> }) {
  const o = (d.overview ?? {}) as Record<string, unknown>
  const posts = (d.recentPosts ?? []) as Array<Record<string, unknown>>
  return (
    <View>
      <View style={styles.kvTable}>
        <KvBox label="Published Posts" value={fmtN(o.published)} />
        <KvBox label="Scheduled Posts" value={fmtN(o.scheduled)} />
        <KvBox label="Draft Posts" value={fmtN(o.drafts)} />
        <KvBox label="Total Pages" value={fmtN(o.totalPages)} />
        <KvBox label="Total Comments" value={fmtN(o.totalComments)} />
        <KvBox label="Pending Comments" value={fmtN(o.pendingComments)} />
      </View>
      {posts.length > 0 ? (
        <>
          <Text style={styles.h3}>Recent Posts</Text>
          <DataTable
            headers={[
              { label: 'Title', w: '55%' },
              { label: 'Status', w: '20%' },
              { label: 'Date', w: '25%' },
            ]}
            rows={posts.slice(0, 20).map((p) => [
              String(p.title ?? '').slice(0, 55),
              String(p.status ?? ''),
              String(p.date ?? '').slice(0, 10),
            ])}
          />
        </>
      ) : null}
    </View>
  )
}

// --- Platform config ---

const PLATFORM_CONFIG: Record<string, { label: string; Section: (props: { d: Record<string, unknown> }) => React.ReactElement }> = {
  googleAds: { label: 'Google Ads', Section: GoogleAdsSection },
  meta: { label: 'Meta Ads', Section: MetaSection },
  tiktok: { label: 'TikTok Ads', Section: TikTokSection },
  linkedin: { label: 'LinkedIn Ads', Section: LinkedInSection },
  ga4: { label: 'Google Analytics (GA4)', Section: GA4Section },
  gsc: { label: 'Google Search Console', Section: GscSection },
  gbp: { label: 'Google Business Profile', Section: GbpSection },
  wordpress: { label: 'WordPress', Section: WordPressSection },
}

export interface SinglePlatformExportInput {
  platform: string
  data: Record<string, unknown>
  workspaceName: string
  startDate: string
  endDate: string
}

export const SinglePlatformPdf = ({ input }: { input: SinglePlatformExportInput }) => {
  const config = PLATFORM_CONFIG[input.platform]
  if (!config) return <Document><Page style={styles.page}><Text>Unknown platform</Text></Page></Document>
  const { label, Section } = config
  const footer = `Generated by Onelytics · ${new Date().toLocaleDateString()}`

  return (
    <Document>
      {/* Cover */}
      <Page style={styles.page}>
        <Text style={styles.coverBrand}>ONELYTICS</Text>
        <Text style={styles.coverTitle}>{label} Report</Text>
        <Text style={styles.coverSubtitle}>{input.workspaceName}</Text>
        <Text style={styles.coverSubtitle}>Reporting Period: {input.startDate}  →  {input.endDate}</Text>
        <Text style={styles.coverDate}>Generated: {new Date().toLocaleDateString()}</Text>
        <Text style={styles.footer} fixed>{footer}</Text>
      </Page>

      {/* Data */}
      <Page style={styles.page}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{label} — Performance Overview</Text>
        </View>
        <Section d={input.data} />
        <Text style={styles.footer} fixed>{footer}</Text>
      </Page>
    </Document>
  )
}

export async function generateSinglePlatformPdf(input: SinglePlatformExportInput): Promise<Buffer> {
  return await renderToBuffer(<SinglePlatformPdf input={input} />) as Buffer
}
