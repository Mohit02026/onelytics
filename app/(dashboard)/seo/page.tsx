'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, defaultDateRange } from '@/components/analytics/date-range-picker'
import { GscOverviewCards } from '@/components/analytics/gsc-overview-cards'
import { GscClicksChart } from '@/components/analytics/gsc-clicks-chart'
import { GscKeywordsTable } from '@/components/analytics/gsc-keywords-table'
import { GscTopPagesTable, GscDeviceCountryBreakdown } from '@/components/analytics/gsc-breakdowns'
import { GbpOverviewCards } from '@/components/analytics/gbp-overview-cards'
import { GbpViewsChart } from '@/components/analytics/gbp-views-chart'
import { GbpCallsChart } from '@/components/analytics/gbp-calls-chart'
import { GbpSearchMapsPie } from '@/components/analytics/gbp-search-maps-pie'
import { GbpReviewsTable } from '@/components/analytics/gbp-reviews-table'
import { GbpPostsTable } from '@/components/analytics/gbp-posts-table'
import { ExportPdfButton } from '@/components/analytics/export-pdf-button'
import { GranularityPicker } from '@/components/analytics/granularity-picker'
import { Button } from '@/components/ui/button'
import { Search, Building2, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { DateRange } from '@/components/analytics/date-range-picker'
import type { GscReport } from '@/services/google/gsc'
import type { GbpReport } from '@/services/google/gbp'
import { aggregateRows, type Granularity } from '@/lib/aggregate'

type GscStatus = 'loading' | 'not-connected' | 'error' | 'loaded'
type GbpStatus = 'loading' | 'not-connected' | 'error' | 'loaded'

export default function SeoPage() {
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [refreshing, setRefreshing] = useState(false)

  const [gscStatus, setGscStatus] = useState<GscStatus>('loading')
  const [gscReport, setGscReport] = useState<GscReport | null>(null)
  const [volumes, setVolumes] = useState<Record<string, number> | undefined>(undefined)

  const [gbpStatus, setGbpStatus] = useState<GbpStatus>('loading')
  const [gbpReport, setGbpReport] = useState<GbpReport | null>(null)

  const fetchAll = useCallback(async (range: DateRange) => {
    setRefreshing(true)

    const start = new Date(range.startDate)
    const end = new Date(range.endDate)
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - days + 1)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const [gscRes, gbpRes] = await Promise.allSettled([
      fetch(`/api/analytics/gsc?startDate=${range.startDate}&endDate=${range.endDate}&compareStartDate=${fmt(prevStart)}&compareEndDate=${fmt(prevEnd)}`),
      fetch(`/api/analytics/gbp?startDate=${range.startDate}&endDate=${range.endDate}`),
    ])

    if (gscRes.status === 'fulfilled') {
      const res = gscRes.value
      if (res.status === 404) { setGscStatus('not-connected') }
      else if (!res.ok) { setGscStatus('error') }
      else {
        const data: GscReport = await res.json()
        setGscReport(data)
        setGscStatus('loaded')
        if (data.keywords?.length > 0) {
          const kwParam = data.keywords.map((k) => k.query).join(',')
          fetch(`/api/analytics/keyword-volume?keywords=${encodeURIComponent(kwParam)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((v) => { if (v && !('error' in v)) setVolumes(v) })
            .catch(() => undefined)
        }
      }
    } else { setGscStatus('error') }

    if (gbpRes.status === 'fulfilled') {
      const res = gbpRes.value
      if (res.status === 404) { setGbpStatus('not-connected') }
      else if (!res.ok) { setGbpStatus('error') }
      else { setGbpReport(await res.json()); setGbpStatus('loaded') }
    } else { setGbpStatus('error') }

    setRefreshing(false)
  }, [])

  useEffect(() => { fetchAll(dateRange) }, [dateRange, fetchAll])

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">SEO</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Organic search rankings, keyword performance, and local presence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => fetchAll(dateRange)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <GranularityPicker value={granularity} onChange={setGranularity} />
          <ExportPdfButton platform="gsc" startDate={dateRange.startDate} endDate={dateRange.endDate} />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* ── Search Console ─────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
          <Search className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Organic Search — Google Search Console</h3>
        </div>

        {gscStatus === 'not-connected' && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-purple-500" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">Search Console not connected</p>
            <p className="text-sm text-gray-500 max-w-xs">Connect your Google account and add your Search Console site URL to see keyword rankings.</p>
            <Button size="sm" render={<Link href="/connect" />} className="bg-blue-600 hover:bg-blue-700 text-white mt-1">Connect</Button>
          </div>
        )}

        {gscStatus === 'error' && (
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 py-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed to load Search Console data.</span>
            <Button variant="outline" size="sm" onClick={() => fetchAll(dateRange)}>Retry</Button>
          </div>
        )}

        {gscStatus === 'loaded' && gscReport && (
          <>
            <GscOverviewCards data={gscReport.overview} />
            <GscClicksChart data={aggregateRows(gscReport.daily, granularity)} />
            <GscKeywordsTable keywords={gscReport.keywords} volumes={volumes} />
            {gscReport.topPages?.length > 0 && <GscTopPagesTable pages={gscReport.topPages} />}
            {(gscReport.devices?.length > 0 || gscReport.countries?.length > 0) && (
              <GscDeviceCountryBreakdown
                devices={gscReport.devices ?? []}
                countries={gscReport.countries ?? []}
              />
            )}
          </>
        )}
      </section>

      {/* ── Google Business Profile ─────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
          <Building2 className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Local Presence — Google Business Profile</h3>
        </div>

        {gbpStatus === 'not-connected' && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">Google Business not connected</p>
            <p className="text-sm text-gray-500 max-w-xs">Connect your Google account and select your business location to see local search data.</p>
            <Button size="sm" render={<Link href="/connect" />} className="bg-blue-600 hover:bg-blue-700 text-white mt-1">Connect</Button>
          </div>
        )}

        {gbpStatus === 'error' && (
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 py-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Failed to load Google Business Profile data.</span>
            <Button variant="outline" size="sm" onClick={() => fetchAll(dateRange)}>Retry</Button>
          </div>
        )}

        {gbpStatus === 'loaded' && gbpReport && (
          <>
            <GbpOverviewCards data={gbpReport.overview} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2"><GbpViewsChart data={aggregateRows(gbpReport.daily, granularity)} /></div>
              <GbpSearchMapsPie data={gbpReport.overview} />
            </div>
            <GbpCallsChart data={aggregateRows(gbpReport.daily, granularity)} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GbpReviewsTable reviews={gbpReport.reviews ?? []} />
              <GbpPostsTable posts={gbpReport.posts ?? []} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
