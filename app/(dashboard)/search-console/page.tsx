'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, defaultDateRange } from '@/components/analytics/date-range-picker'
import { GscOverviewCards } from '@/components/analytics/gsc-overview-cards'
import { GscClicksChart } from '@/components/analytics/gsc-clicks-chart'
import { GscKeywordsTable } from '@/components/analytics/gsc-keywords-table'
import { GscTopPagesTable, GscDeviceCountryBreakdown } from '@/components/analytics/gsc-breakdowns'
import { Button } from '@/components/ui/button'
import { Search, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { DateRange } from '@/components/analytics/date-range-picker'
import type { GscReport } from '@/services/google/gsc'

type Status = 'loading' | 'not-connected' | 'error' | 'loaded'

export default function SearchConsolePage() {
  const [status, setStatus] = useState<Status>('loading')
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [report, setReport] = useState<GscReport | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [volumes, setVolumes] = useState<Record<string, number> | undefined>(undefined)

  const fetchReport = useCallback(async (range: DateRange) => {
    setRefreshing(true)
    try {
      const start = new Date(range.startDate)
      const end = new Date(range.endDate)
      const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - days + 1)
      const fmt = (d: Date) => d.toISOString().split('T')[0]
      const compareStart = fmt(prevStart)
      const compareEnd = fmt(prevEnd)

      const res = await fetch(
        `/api/analytics/gsc?startDate=${range.startDate}&endDate=${range.endDate}&compareStartDate=${compareStart}&compareEndDate=${compareEnd}`
      )
      if (res.status === 404) { setStatus('not-connected'); return }
      if (!res.ok) throw new Error('Failed to fetch')
      const data: GscReport = await res.json()
      setReport(data)
      setStatus('loaded')

      // Fetch keyword volumes non-blocking (requires Google Ads customer ID)
      if (data.keywords?.length > 0) {
        const kwParam = data.keywords.map((k) => k.query).join(',')
        fetch(`/api/analytics/keyword-volume?keywords=${encodeURIComponent(kwParam)}`)
          .then((r) => r.ok ? r.json() : null)
          .then((v) => { if (v && typeof v === 'object' && !('error' in v)) setVolumes(v) })
          .catch(() => undefined)
      }
    } catch {
      setStatus('error')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchReport(dateRange) }, [dateRange, fetchReport])

  if (status === 'loading') return <GscSkeleton />

  if (status === 'not-connected') {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center mb-6">
          <Search className="w-7 h-7 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Search Console not connected
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          Connect your Google account and add your Search Console site URL to see organic search data.
        </p>
        <Button render={<Link href="/connect" />} className="bg-blue-600 hover:bg-blue-700 text-white">
          Go to Connect
        </Button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 text-red-600 dark:text-red-400 p-6">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load Search Console data.</span>
        <Button variant="outline" size="sm" onClick={() => fetchReport(dateRange)}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Search Console</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Organic search performance, keywords, and rankings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => fetchReport(dateRange)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {report && <GscOverviewCards data={report.overview} />}

      {report && (
        <div className="space-y-6">
          <GscClicksChart data={report.daily} />
          <GscKeywordsTable keywords={report.keywords} volumes={volumes} />
          {report.topPages?.length > 0 && <GscTopPagesTable pages={report.topPages} />}
          {(report.devices?.length > 0 || report.countries?.length > 0) && (
            <GscDeviceCountryBreakdown
              devices={report.devices ?? []}
              countries={report.countries ?? []}
            />
          )}
        </div>
      )}
    </div>
  )
}

function GscSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-3.5 w-56 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>
  )
}
