'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, defaultDateRange } from '@/components/analytics/date-range-picker'
import { MetaOverviewCards } from '@/components/analytics/meta-overview-cards'
import { MetaSpendChart } from '@/components/analytics/meta-spend-chart'
import { MetaCampaignsTable } from '@/components/analytics/meta-campaigns-table'
import { Button } from '@/components/ui/button'
import { Share2, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { DateRange } from '@/components/analytics/date-range-picker'
import type { MetaReport } from '@/services/meta/ads'

type Status = 'loading' | 'not-connected' | 'error' | 'loaded'

export default function MetaAdsPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [report, setReport] = useState<MetaReport | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchReport = useCallback(async (range: DateRange) => {
    setRefreshing(true)
    try {
      const res = await fetch(
        `/api/analytics/meta?startDate=${range.startDate}&endDate=${range.endDate}`
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

  if (status === 'loading') return <MetaSkeleton />

  if (status === 'not-connected') {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/50 rounded-2xl flex items-center justify-center mb-6">
          <Share2 className="w-7 h-7 text-pink-600 dark:text-pink-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Meta Ads not connected
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          Connect your Meta account to see Facebook and Instagram ad performance.
        </p>
        <Button render={<Link href="/connect" />} className="bg-blue-600 hover:bg-blue-700 text-white">
          Connect Meta
        </Button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 text-red-600 dark:text-red-400 p-6">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load Meta Ads data.</span>
        <Button variant="outline" size="sm" onClick={() => fetchReport(dateRange)}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meta Ads</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Facebook & Instagram ad spend, reach, and conversions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => fetchReport(dateRange)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {report && <MetaOverviewCards data={report.overview} />}

      {report && (
        <div className="space-y-6">
          <MetaSpendChart data={report.daily} />
          <MetaCampaignsTable campaigns={report.campaigns} />
        </div>
      )}
    </div>
  )
}

function MetaSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-3.5 w-52 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      <div className="h-56 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>
  )
}
