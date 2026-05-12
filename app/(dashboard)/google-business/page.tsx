'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, defaultDateRange } from '@/components/analytics/date-range-picker'
import { GbpOverviewCards } from '@/components/analytics/gbp-overview-cards'
import { GbpCallsChart } from '@/components/analytics/gbp-calls-chart'
import { GbpViewsChart } from '@/components/analytics/gbp-views-chart'
import { Button } from '@/components/ui/button'
import { ExportPdfButton } from '@/components/analytics/export-pdf-button'
import { Building2, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { DateRange } from '@/components/analytics/date-range-picker'
import type { GbpReport } from '@/services/google/gbp'

type Status = 'loading' | 'not-connected' | 'error' | 'loaded'

export default function GoogleBusinessPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [report, setReport] = useState<GbpReport | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchReport = useCallback(async (range: DateRange) => {
    setRefreshing(true)
    try {
      const res = await fetch(
        `/api/analytics/gbp?startDate=${range.startDate}&endDate=${range.endDate}`
      )
      if (res.status === 404) { setStatus('not-connected'); return }
      if (!res.ok) throw new Error('Failed to fetch')
      setReport(await res.json())
      setStatus('loaded')
    } catch {
      setStatus('error')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchReport(dateRange) }, [dateRange, fetchReport])

  if (status === 'loading') return <GbpSkeleton />

  if (status === 'not-connected') {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-6">
          <Building2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Google Business not connected
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          Connect your Google account and select your location to see business profile data.
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
        <span>Failed to load Google Business Profile data.</span>
        <Button variant="outline" size="sm" onClick={() => fetchReport(dateRange)}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Google Business</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Local search performance, views, and interactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => fetchReport(dateRange)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <ExportPdfButton platform="gbp" startDate={dateRange.startDate} endDate={dateRange.endDate} />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {report && <GbpOverviewCards data={report.overview} />}

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GbpViewsChart data={report.daily} />
          <GbpCallsChart data={report.daily} />
        </div>
      )}
    </div>
  )
}

function GbpSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-3.5 w-56 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
