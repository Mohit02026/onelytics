import React from 'react'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { ReportData } from '@/services/reports/generate'

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
  coverTitle: { fontSize: 32, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 150, color: C.textHeading },
  coverBrand: { fontSize: 24, fontFamily: 'Helvetica-Bold', textAlign: 'center', color: C.primary, marginBottom: 120 },
  coverSubtitle: { fontSize: 14, textAlign: 'center', color: C.textMuted, marginTop: 16 },
  coverDate: { fontSize: 12, textAlign: 'center', color: C.textMuted, marginTop: 40, fontStyle: 'italic' },
  h2: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.textHeading, marginTop: 24, marginBottom: 12 },
  h3: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.textHeading, marginTop: 16, marginBottom: 8 },
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
  narrativeText: { fontSize: 11, color: C.textHeading, lineHeight: 1.5, marginBottom: 6 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: C.textMuted, fontSize: 8 },
  mutedAlert: { fontSize: 10, color: C.textMuted, fontStyle: 'italic', marginBottom: 10 },
})

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

const TableHeader = ({ cols }: { cols: { label: string; w: string }[] }) => (
  <View style={styles.trHeader}>
    {cols.map((c, i) => (
      <Text key={i} style={[styles.th, { width: c.w }]}>{c.label}</Text>
    ))}
  </View>
)

const TableRow = ({ row, cols, alt }: { row: string[]; cols: { w: string }[]; alt: boolean }) => (
  <View style={alt ? styles.trAlt : styles.tr}>
    {row.map((val, i) => (
      <Text key={i} style={[styles.td, { width: cols[i].w }]}>{val}</Text>
    ))}
  </View>
)

const DataTable = ({ headers, rows }: { headers: { label: string; w: string }[]; rows: string[][] }) => (
  <View style={styles.table}>
    <TableHeader cols={headers} />
    {rows.map((row, i) => (
      <TableRow key={i} row={row} cols={headers} alt={i % 2 === 1} />
    ))}
  </View>
)

const KvBox = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.kvBox}>
    <Text style={styles.kvLabel}>{label}</Text>
    <Text style={styles.kvValue}>{value}</Text>
  </View>
)

export const PdfDocument = ({ data, title, startDate, endDate, createdAt }: { data: ReportData, title: string, startDate: string, endDate: string, createdAt: Date }) => {
  const s = data.executiveSummary
  const p = data.platforms ?? {}

  return (
    <Document>
      <Page style={styles.page}>
        <Text style={styles.coverBrand}>ONELYTICS</Text>
        <Text style={styles.coverTitle}>{title}</Text>
        <Text style={styles.coverSubtitle}>Reporting Period: {startDate}  →  {endDate}</Text>
        <Text style={styles.coverDate}>Generated: {new Date(createdAt).toLocaleDateString()}</Text>
      </Page>

      <Page style={styles.page}>
        <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>Executive Summary</Text></View>
        <View style={styles.kvTable}>
          <KvBox label="Total Ad Spend" value={fmt$(s.totalSpend)} />
          <KvBox label="Total Impressions" value={fmtN(s.totalImpressions)} />
          <KvBox label="Total Clicks" value={fmtN(s.totalClicks)} />
          <KvBox label="Total Conversions" value={fmtN(s.totalConversions)} />
          <KvBox label="Average CTR" value={fmtPct(s.avgCtr)} />
          <KvBox label="Average CPA" value={fmt$(s.avgCpa)} />
        </View>

        <Text style={styles.h3}>Period-over-Period Comparison</Text>
        <DataTable
          headers={[
            { label: 'Metric', w: '40%' },
            { label: 'Current Period', w: '20%' },
            { label: 'Previous Period', w: '20%' },
            { label: 'Change', w: '20%' },
          ]}
          rows={data.momComparisons.map((m) => [
            m.label,
            m.format === 'money' ? fmt$(m.current) : m.format === 'pct' ? fmtPct(m.current) : fmtN(m.current),
            m.format === 'money' ? fmt$(m.previous) : m.format === 'pct' ? fmtPct(m.previous) : fmtN(m.previous),
            fmtDelta(m.delta),
          ])}
        />

        {data.channels.length > 0 && (
          <>
            <Text style={styles.h3}>Channel Performance Summary</Text>
            <DataTable
              headers={[
                { label: 'Channel', w: '16%' },
                { label: 'Spend', w: '12%' },
                { label: 'Share', w: '10%' },
                { label: 'Impr.', w: '12%' },
                { label: 'Clicks', w: '12%' },
                { label: 'CTR', w: '10%' },
                { label: 'Conv.', w: '10%' },
                { label: 'CPA', w: '10%' },
                { label: 'ROAS', w: '8%' },
              ]}
              rows={[
                ...data.channels.map((c) => [
                  c.channel,
                  fmt$(c.spend),
                  s.totalSpend > 0 ? `${((c.spend / s.totalSpend) * 100).toFixed(1)}%` : '—',
                  fmtN(c.impressions),
                  fmtN(c.clicks),
                  fmtPct(c.ctr),
                  fmtN(c.conversions),
                  fmt$(c.cpa),
                  c.roas ? fmtX(c.roas) : '—',
                ]),
                [
                  'TOTAL', fmt$(s.totalSpend), '100%', fmtN(s.totalImpressions), fmtN(s.totalClicks),
                  fmtPct(s.avgCtr), fmtN(s.totalConversions), fmt$(s.avgCpa), '—'
                ]
              ]}
            />
          </>
        )}
        <Text style={styles.footer} fixed>Generated by Onelytics · {new Date(createdAt).toLocaleDateString()}</Text>
      </Page>

      {/* AI Narrative */}
      {data.aiNarrative?.trim() && (
        <Page style={styles.page}>
          <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>AI Insights</Text></View>
          {data.aiNarrative.split('\n').filter((l) => l.replace(/^[•\-\*]\s*/, '').trim()).map((line, i) => {
            const clean = line.replace(/^[•\-\*]\s*/, '').trim()
            return <Text key={i} style={styles.narrativeText}>{line.startsWith('-') || line.startsWith('•') ? `• ${clean}` : clean}</Text>
          })}
          <Text style={styles.footer} fixed>Generated by Onelytics · {new Date(createdAt).toLocaleDateString()}</Text>
        </Page>
      )}

      {/* Daily Spend */}
      {data.dailySpend.length > 0 && (
        <Page style={styles.page}>
          <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>Daily Spend by Channel</Text></View>
          <DataTable
            headers={[
              { label: 'Date', w: '20%' },
              { label: 'Google Ads', w: '20%' },
              { label: 'Meta Ads', w: '20%' },
              { label: 'TikTok Ads', w: '20%' },
              { label: 'LinkedIn Ads', w: '20%' },
            ]}
            rows={data.dailySpend.map(d => [
              String(d.date),
              fmt$(d['Google Ads'] ?? 0),
              fmt$(d['Meta Ads'] ?? 0),
              fmt$(d['TikTok Ads'] ?? 0),
              fmt$(d['LinkedIn Ads'] ?? 0),
            ])}
          />
          <Text style={styles.footer} fixed>Generated by Onelytics · {new Date(createdAt).toLocaleDateString()}</Text>
        </Page>
      )}

      {/* Platforms */}
      <Page style={styles.page}>
        <View>
          <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>Detailed Platform Performance</Text></View>

          {p.googleAds?.overview ? (
            <View>
              <Text style={styles.h2}>Google Ads</Text>
              {p.googleAds.source === 'ga4' ? <Text style={styles.mutedAlert}>⚠ Data sourced from GA4 linked account</Text> : null}
              <View style={styles.kvTable}>
                <KvBox label="Ad Spend" value={fmt$((p.googleAds.overview as any).spend)} />
                <KvBox label="Clicks" value={fmtN((p.googleAds.overview as any).clicks)} />
                <KvBox label="Impressions" value={fmtN((p.googleAds.overview as any).impressions)} />
                <KvBox label="CPC" value={fmt$((p.googleAds.overview as any).cpc)} />
                <KvBox label="Conversions" value={fmtN((p.googleAds.overview as any).conversions)} />
                <KvBox label="ROAS" value={(p.googleAds.overview as any).roas ? fmtX((p.googleAds.overview as any).roas) : '—'} />
              </View>
              {Array.isArray(p.googleAds.campaigns) && p.googleAds.campaigns.length > 0 ? (
                <View>
                  <Text style={styles.h3}>Top Campaigns</Text>
                  <DataTable
                    headers={[
                      { label: 'Campaign', w: '40%' },
                      { label: 'Spend', w: '12%' },
                      { label: 'Clicks', w: '12%' },
                      { label: 'Impr.', w: '12%' },
                      { label: 'CPC', w: '12%' },
                      { label: 'ROAS', w: '12%' },
                    ]}
                    rows={p.googleAds.campaigns.slice(0, 15).map((c: any) => [
                      String(c.name).slice(0, 40), fmt$(c.spend), fmtN(c.clicks), fmtN(c.impressions), fmt$(c.cpc), c.roas ? fmtX(c.roas) : '—'
                    ])}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {p.meta?.overview ? (
            <View>
              <Text style={styles.h2}>Meta Ads</Text>
              <View style={styles.kvTable}>
                <KvBox label="Ad Spend" value={fmt$((p.meta.overview as any).spend)} />
                <KvBox label="Reach" value={fmtN((p.meta.overview as any).reach)} />
                <KvBox label="Impressions" value={fmtN((p.meta.overview as any).impressions)} />
                <KvBox label="Clicks" value={fmtN((p.meta.overview as any).clicks)} />
                <KvBox label="Conversions" value={fmtN((p.meta.overview as any).conversions)} />
                <KvBox label="ROAS" value={(p.meta.overview as any).roas ? fmtX((p.meta.overview as any).roas) : '—'} />
              </View>
              {Array.isArray(p.meta.campaigns) && p.meta.campaigns.length > 0 ? (
                <View>
                  <Text style={styles.h3}>Top Campaigns</Text>
                  <DataTable
                    headers={[
                      { label: 'Campaign', w: '35%' },
                      { label: 'Status', w: '15%' },
                      { label: 'Spend', w: '10%' },
                      { label: 'Reach', w: '10%' },
                      { label: 'Impr.', w: '10%' },
                      { label: 'Conv.', w: '10%' },
                      { label: 'ROAS', w: '10%' },
                    ]}
                    rows={p.meta.campaigns.slice(0, 15).map((c: any) => [
                      String(c.name).slice(0, 35), String(c.status), fmt$(c.spend), fmtN(c.reach), fmtN(c.impressions), fmtN(c.conversions), c.roas ? fmtX(c.roas) : '—'
                    ])}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {p.tiktok?.overview ? (
            <View>
              <Text style={styles.h2}>TikTok Ads</Text>
              <View style={styles.kvTable}>
                <KvBox label="Ad Spend" value={fmt$((p.tiktok.overview as any).spend)} />
                <KvBox label="Reach" value={fmtN((p.tiktok.overview as any).reach)} />
                <KvBox label="Video Views" value={fmtN((p.tiktok.overview as any).videoViews)} />
                <KvBox label="Clicks" value={fmtN((p.tiktok.overview as any).clicks)} />
                <KvBox label="Conversions" value={fmtN((p.tiktok.overview as any).conversions)} />
                <KvBox label="ROAS" value={(p.tiktok.overview as any).roas ? fmtX((p.tiktok.overview as any).roas) : '—'} />
              </View>
            </View>
          ) : null}

          {p.linkedin?.overview ? (
            <View>
              <Text style={styles.h2}>LinkedIn Ads</Text>
              <View style={styles.kvTable}>
                <KvBox label="Ad Spend" value={fmt$((p.linkedin.overview as any).spend)} />
                <KvBox label="Impressions" value={fmtN((p.linkedin.overview as any).impressions)} />
                <KvBox label="Eng. Rate" value={fmtPct((p.linkedin.overview as any).engagementRate)} />
                <KvBox label="Clicks" value={fmtN((p.linkedin.overview as any).clicks)} />
                <KvBox label="Conversions" value={fmtN((p.linkedin.overview as any).conversions)} />
                <KvBox label="Leads" value={fmtN((p.linkedin.overview as any).leads ?? 0)} />
              </View>
            </View>
          ) : null}

          {p.ga4?.overview ? (
            <View>
              <Text style={styles.h2}>Google Analytics (GA4)</Text>
              <View style={styles.kvTable}>
                <KvBox label="Sessions" value={fmtN((p.ga4.overview as any).sessions)} />
                <KvBox label="Users" value={fmtN((p.ga4.overview as any).users)} />
                <KvBox label="Pageviews" value={fmtN((p.ga4.overview as any).pageviews)} />
              </View>
              {Array.isArray(p.ga4.topPages) && p.ga4.topPages.length > 0 ? (
                <View>
                  <Text style={styles.h3}>Top Pages</Text>
                  <DataTable
                    headers={[
                      { label: 'Page', w: '60%' },
                      { label: 'Pageviews', w: '20%' },
                      { label: 'Avg Time', w: '20%' },
                    ]}
                    rows={p.ga4.topPages.slice(0, 10).map((page: any) => [
                      String(page.page).slice(0, 60), fmtN(page.pageviews), fmtSec(page.avgTimeOnPage)
                    ])}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {p.gsc?.overview ? (
            <View>
              <Text style={styles.h2}>Google Search Console</Text>
              <View style={styles.kvTable}>
                <KvBox label="Total Clicks" value={fmtN((p.gsc.overview as any).clicks)} />
                <KvBox label="Impressions" value={fmtN((p.gsc.overview as any).impressions)} />
                <KvBox label="Avg. Position" value={n((p.gsc.overview as any).position).toFixed(1)} />
              </View>
              {Array.isArray(p.gsc.keywords) && p.gsc.keywords.length > 0 ? (
                <View>
                  <Text style={styles.h3}>Top Keywords</Text>
                  <DataTable
                    headers={[
                      { label: 'Keyword', w: '50%' },
                      { label: 'Clicks', w: '15%' },
                      { label: 'Impr.', w: '15%' },
                      { label: 'Position', w: '20%' },
                    ]}
                    rows={p.gsc.keywords.slice(0, 15).map((k: any) => [
                      String(k.keyword), fmtN(k.clicks), fmtN(k.impressions), n(k.position).toFixed(1) + (k.positionChange ? ` (${fmtDelta(-k.positionChange)})` : '')
                    ])}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {p.gbp?.overview ? (
            <View>
              <Text style={styles.h2}>Google Business Profile</Text>
              <View style={styles.kvTable}>
                <KvBox label="Profile Views" value={fmtN((p.gbp.overview as any).views)} />
                <KvBox label="Website Clicks" value={fmtN((p.gbp.overview as any).websiteClicks)} />
                <KvBox label="Calls" value={fmtN((p.gbp.overview as any).calls)} />
                <KvBox label="Directions" value={fmtN((p.gbp.overview as any).directions)} />
                <KvBox label="Messages" value={fmtN((p.gbp.overview as any).messages)} />
                <KvBox label="Bookings" value={fmtN((p.gbp.overview as any).bookings)} />
              </View>
            </View>
          ) : null}

          {p.wordpress?.overview ? (
            <View>
              <Text style={styles.h2}>WordPress Content</Text>
              <View style={styles.kvTable}>
                <KvBox label="Published Posts" value={fmtN((p.wordpress.overview as any).published)} />
                <KvBox label="Scheduled Posts" value={fmtN((p.wordpress.overview as any).scheduled)} />
                <KvBox label="Total Comments" value={fmtN((p.wordpress.overview as any).totalComments)} />
              </View>
            </View>
          ) : null}
        </View>

        <Text style={styles.footer} fixed>Generated by Onelytics · {new Date(createdAt).toLocaleDateString()}</Text>
      </Page>
    </Document>
  )
}

export async function generatePdf(data: ReportData, title: string, startDate: string, endDate: string, createdAt: Date) {
  return await renderToBuffer(
    <PdfDocument data={data} title={title} startDate={startDate} endDate={endDate} createdAt={createdAt} />
  )
}
