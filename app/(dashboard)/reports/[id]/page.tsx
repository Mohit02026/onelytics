'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReportExecutiveSummary } from '@/components/analytics/report-executive-summary'
import { ReportChannelTable } from '@/components/analytics/report-channel-table'
import { ReportSpendBreakdown } from '@/components/analytics/report-spend-breakdown'
import { ReportMoMComparison } from '@/components/analytics/report-mom-comparison'
import type { ReportData } from '@/services/reports/generate'
import { Loader2, ArrowLeft, Calendar, Download } from 'lucide-react'

interface StoredReport {
  id: string
  title: string
  startDate: string
  endDate: string
  status: string
  data: ReportData | null
  createdAt: string
}

function skeleton(cls: string) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${cls}`} />
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<StoredReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setReport(d)
      })
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        {skeleton('h-8 w-64')}
        <div className="grid grid-cols-6 gap-3">{[...Array(6)].map((_, i) => skeleton(`h-24 ${i}`))} </div>
        {skeleton('h-48 w-full')}
        {skeleton('h-72 w-full')}
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <p className="text-gray-500">{error ?? 'Report not found.'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/reports')}>
          Back to Reports
        </Button>
      </div>
    )
  }

  if (report.status !== 'READY' || !report.data) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Report is {report.status === 'GENERATING' ? 'still generating' : 'unavailable'}.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/reports')}>
          Back to Reports
        </Button>
      </div>
    )
  }

  const data = report.data

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push('/reports')}
          className="mt-1 p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{report.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {report.startDate} → {report.endDate}
            <span className="mx-1 text-gray-300">·</span>
            Generated {new Date(report.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => { window.location.href = `/api/reports/${report.id}/download` }}
        >
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      {/* Executive Summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Executive Summary
        </h3>
        <ReportExecutiveSummary data={data} />
      </section>

      {/* MoM Comparison */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Period-over-Period Comparison
        </h3>
        <ReportMoMComparison comparisons={data.momComparisons} />
      </section>

      {/* Daily Spend */}
      {data.dailySpend.length > 0 && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base">Daily Ad Spend by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportSpendBreakdown data={data} />
          </CardContent>
        </Card>
      )}

      {/* Channel Breakdown Table */}
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Channel Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <ReportChannelTable channels={data.channels} />
        </CardContent>
      </Card>

      {/* Platform Detail Sections */}
      {data.platforms && <PlatformDetails platforms={data.platforms} />}
    </div>
  )
}

function KvGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-x-auto mt-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {headers.map((h) => (
              <th key={h} className="text-left py-2 px-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 1 ? 'bg-gray-50 dark:bg-gray-800/30' : ''}>
              {row.map((cell, j) => (
                <td key={j} className="py-2 px-3 text-gray-700 dark:text-gray-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function fmtN(v: unknown) { return (typeof v === 'number' ? v : 0).toLocaleString('en-US') }
function fmt$(v: unknown) { return '$' + (typeof v === 'number' ? v : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtPct(v: unknown) { return (typeof v === 'number' ? v : 0).toFixed(2) + '%' }
function fmtSec(v: unknown) {
  const s = typeof v === 'number' ? v : 0
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

// Platform data stored as Record<string,unknown> — use a typed accessor to keep ESLint happy
type Plat = Record<string, Record<string, unknown>>

function ov(plat: Plat, key: string): Record<string, unknown> {
  return (plat[key]?.overview ?? {}) as Record<string, unknown>
}

function PlatformDetails({ platforms }: { platforms: NonNullable<import('@/services/reports/generate').ReportData['platforms']> }) {
  const p = platforms as unknown as Plat
  const hasAnyPlatform = p.googleAds?.overview || p.meta?.overview || p.tiktok?.overview || p.linkedin?.overview || p.ga4?.overview || p.gsc?.overview || p.gbp?.overview || p.wordpress?.overview
  if (!hasAnyPlatform) return null

  const gAds = ov(p, 'googleAds')
  const meta = ov(p, 'meta')
  const tiktok = ov(p, 'tiktok')
  const linkedin = ov(p, 'linkedin')
  const ga4 = ov(p, 'ga4')
  const gsc = ov(p, 'gsc')
  const gbp = ov(p, 'gbp')
  const wp = ov(p, 'wordpress')

  const n = (v: unknown) => (typeof v === 'number' ? v : 0)
  const rows = (arr: unknown): unknown[] => (Array.isArray(arr) ? arr : [])

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detailed Platform Performance</h3>

      {!!p.googleAds?.overview && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader><CardTitle className="text-base">Google Ads</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <KvGrid items={[
              { label: 'Ad Spend', value: fmt$(gAds.spend) },
              { label: 'Clicks', value: fmtN(gAds.clicks) },
              { label: 'Impressions', value: fmtN(gAds.impressions) },
              { label: 'CTR', value: fmtPct(gAds.ctr) },
              { label: 'Conversions', value: fmtN(gAds.conversions ?? 0) },
              { label: 'Cost/Conv.', value: gAds.costPerConversion ? fmt$(gAds.costPerConversion) : '—' },
              { label: 'Phone Calls', value: fmtN(gAds.phoneCalls ?? 0) },
              { label: 'ROAS', value: gAds.roas ? `${n(gAds.roas).toFixed(2)}x` : '—' },
            ]} />
            {rows(p.googleAds?.campaigns).length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">Top Campaigns</p>
                <SimpleTable
                  headers={['Campaign', 'Spend', 'Clicks', 'Conv.', 'CPA', 'ROAS']}
                  rows={rows(p.googleAds?.campaigns).slice(0, 10).map((c) => {
                    const campaign = c as Record<string, unknown>
                    return [
                      String(campaign.name ?? '').slice(0, 40),
                      fmt$(campaign.spend),
                      fmtN(campaign.clicks),
                      n(campaign.conversions ?? 0).toFixed(1),
                      n(campaign.costPerConversion) > 0 ? fmt$(campaign.costPerConversion) : '—',
                      n(campaign.roas) > 0 ? `${n(campaign.roas).toFixed(2)}x` : '—',
                    ]
                  })}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!!p.meta?.overview && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader><CardTitle className="text-base">Meta Ads</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <KvGrid items={[
              { label: 'Ad Spend', value: fmt$(meta.spend) },
              { label: 'Reach', value: fmtN(meta.reach) },
              { label: 'Impressions', value: fmtN(meta.impressions) },
              { label: 'Clicks', value: fmtN(meta.clicks) },
              { label: 'Conversions', value: fmtN(meta.conversions) },
              { label: 'ROAS', value: meta.roas ? `${n(meta.roas).toFixed(2)}x` : '—' },
            ]} />
            {rows(p.meta?.campaigns).length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">Top Campaigns</p>
                <SimpleTable
                  headers={['Campaign', 'Spend', 'Reach', 'Impressions', 'Conv.', 'ROAS']}
                  rows={rows(p.meta?.campaigns).slice(0, 10).map((c) => {
                    const campaign = c as Record<string, unknown>
                    return [
                      String(campaign.name ?? '').slice(0, 35),
                      fmt$(campaign.spend),
                      fmtN(campaign.reach),
                      fmtN(campaign.impressions),
                      fmtN(campaign.conversions),
                      campaign.roas ? `${n(campaign.roas).toFixed(2)}x` : '—',
                    ]
                  })}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!!p.tiktok?.overview && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader><CardTitle className="text-base">TikTok Ads</CardTitle></CardHeader>
          <CardContent>
            <KvGrid items={[
              { label: 'Ad Spend', value: fmt$(tiktok.spend) },
              { label: 'Reach', value: fmtN(tiktok.reach) },
              { label: 'Video Views', value: fmtN(tiktok.videoViews) },
              { label: 'Clicks', value: fmtN(tiktok.clicks) },
              { label: 'Conversions', value: fmtN(tiktok.conversions) },
              { label: 'ROAS', value: tiktok.roas ? `${n(tiktok.roas).toFixed(2)}x` : '—' },
            ]} />
          </CardContent>
        </Card>
      )}

      {!!p.linkedin?.overview && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader><CardTitle className="text-base">LinkedIn Ads</CardTitle></CardHeader>
          <CardContent>
            <KvGrid items={[
              { label: 'Ad Spend', value: fmt$(linkedin.spend) },
              { label: 'Impressions', value: fmtN(linkedin.impressions) },
              { label: 'Clicks', value: fmtN(linkedin.clicks) },
              { label: 'Eng. Rate', value: fmtPct(linkedin.engagementRate) },
              { label: 'Conversions', value: fmtN(linkedin.conversions) },
              { label: 'Leads', value: fmtN(linkedin.leads ?? 0) },
            ]} />
          </CardContent>
        </Card>
      )}

      {!!p.ga4?.overview && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader><CardTitle className="text-base">Google Analytics (GA4)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <KvGrid items={[
              { label: 'Sessions', value: fmtN(ga4.sessions) },
              { label: 'Users', value: fmtN(ga4.users) },
              { label: 'New Users', value: fmtN(ga4.newUsers ?? 0) },
              { label: 'Pageviews', value: fmtN(ga4.pageviews) },
              { label: 'Bounce Rate', value: fmtPct(ga4.bounceRate) },
              { label: 'Avg. Session', value: fmtSec(ga4.avgSessionDuration) },
            ]} />
            {rows(p.ga4?.topPages).length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">Top Pages</p>
                <SimpleTable
                  headers={['Page', 'Pageviews', 'Avg Time']}
                  rows={rows(p.ga4?.topPages).slice(0, 10).map((pg) => {
                    const page = pg as Record<string, unknown>
                    return [String(page.page ?? '').slice(0, 60), fmtN(page.pageviews), fmtSec(page.avgTimeOnPage)]
                  })}
                />
              </>
            )}
            {rows(p.ga4?.trafficSources).length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">Traffic Sources</p>
                <SimpleTable
                  headers={['Source', 'Sessions', 'Share']}
                  rows={rows(p.ga4?.trafficSources).slice(0, 8).map((src) => {
                    const s = src as Record<string, unknown>
                    return [String(s.source ?? ''), fmtN(s.sessions), `${s.percentage ?? 0}%`]
                  })}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!!p.gsc?.overview && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader><CardTitle className="text-base">Google Search Console</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <KvGrid items={[
              { label: 'Total Clicks', value: fmtN(gsc.clicks) },
              { label: 'Impressions', value: fmtN(gsc.impressions) },
              { label: 'Avg. CTR', value: fmtPct(n(gsc.ctr) * 100) },
              { label: 'Avg. Position', value: gsc.position != null ? n(gsc.position).toFixed(1) : '—' },
            ]} />
            {rows(p.gsc?.keywords).length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">Top Keywords</p>
                <SimpleTable
                  headers={['Keyword', 'Clicks', 'Impressions', 'Position']}
                  rows={rows(p.gsc?.keywords).slice(0, 15).map((kw) => {
                    const k = kw as Record<string, unknown>
                    const pos = n(k.position).toFixed(1)
                    const change = typeof k.positionChange === 'number' ? ` (${k.positionChange > 0 ? '+' : ''}${k.positionChange})` : ''
                    return [String(k.query ?? ''), fmtN(k.clicks), fmtN(k.impressions), pos + change]
                  })}
                />
              </>
            )}
            {rows(p.gsc?.topPages).length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2">Top Pages</p>
                <SimpleTable
                  headers={['Page', 'Clicks', 'Impressions', 'CTR']}
                  rows={rows(p.gsc?.topPages).slice(0, 10).map((pg) => {
                    const page = pg as Record<string, unknown>
                    return [String(page.page ?? '').slice(0, 60), fmtN(page.clicks), fmtN(page.impressions), fmtPct(n(page.ctr) * 100)]
                  })}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!!p.gbp?.overview && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader><CardTitle className="text-base">Google Business Profile</CardTitle></CardHeader>
          <CardContent>
            <KvGrid items={[
              { label: 'Total Views', value: fmtN(gbp.totalViews ?? 0) },
              { label: 'Search Views', value: fmtN(gbp.searchViews ?? 0) },
              { label: 'Maps Views', value: fmtN(gbp.mapViews ?? 0) },
              { label: 'Photo Views', value: fmtN(gbp.photoViews ?? 0) },
              { label: 'Website Clicks', value: fmtN(gbp.websiteClicks ?? 0) },
              { label: 'Calls', value: fmtN(gbp.calls ?? 0) },
              { label: 'Directions', value: fmtN(gbp.directionRequests ?? 0) },
              { label: 'Avg Rating', value: gbp.avgRating ? n(gbp.avgRating).toFixed(1) : '—' },
              { label: 'Total Reviews', value: fmtN(gbp.totalReviews ?? 0) },
            ]} />
          </CardContent>
        </Card>
      )}

      {!!p.wordpress?.overview && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader><CardTitle className="text-base">WordPress</CardTitle></CardHeader>
          <CardContent>
            <KvGrid items={[
              { label: 'Published Posts', value: fmtN(wp.published) },
              { label: 'Scheduled Posts', value: fmtN(wp.scheduled) },
              { label: 'Total Comments', value: fmtN(wp.totalComments) },
            ]} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
