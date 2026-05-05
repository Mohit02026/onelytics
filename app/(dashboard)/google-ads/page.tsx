'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, defaultDateRange } from '@/components/analytics/date-range-picker'
import { AdsOverviewCards } from '@/components/analytics/ads-overview-cards'
import { AdsSpendChart } from '@/components/analytics/ads-spend-chart'
import { AdsCampaignsTable } from '@/components/analytics/ads-campaigns-table'
import { Button } from '@/components/ui/button'
import { Activity, RefreshCw, AlertCircle, Info } from 'lucide-react'
import Link from 'next/link'
import type { DateRange } from '@/components/analytics/date-range-picker'
import type { AdsReport } from '@/services/google/ads'

type Status = 'loading' | 'not-connected' | 'error' | 'loaded'

export default function GoogleAdsPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [report, setReport] = useState<AdsReport | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const fetchReport = useCallback(async (range: DateRange) => {
    setRefreshing(true)
    try {
      const res = await fetch(
        `/api/analytics/ads?startDate=${range.startDate}&endDate=${range.endDate}`
      )
      if (res.status === 404) { setStatus('not-connected'); return }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? `HTTP ${res.status}`)
        throw new Error(data.error ?? 'Failed to fetch')
      }
      setReport(await res.json())
      setStatus('loaded')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setStatus('error')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchReport(dateRange) }, [dateRange, fetchReport])

  if (status === 'loading') return <AdsSkeleton />

  if (status === 'not-connected') {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6">
          <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Google Ads not connected
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          Connect your Google account to start seeing Ads campaign data.
        </p>
        <Button render={<Link href="/connect" />} className="bg-blue-600 hover:bg-blue-700 text-white">
          Connect Google
        </Button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 text-red-600 dark:text-red-400 p-6">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load Ads data{errorMsg ? `: ${errorMsg}` : ''}.</span>
        <Button variant="outline" size="sm" onClick={() => fetchReport(dateRange)}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Google Ads</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Campaign spend, clicks, and ROAS</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => fetchReport(dateRange)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {report?.source === 'ga4' && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Data sourced from GA4 (linked Google Ads account). Campaign-level metrics reflect sessions attributed to Google Ads.
            Full Google Ads API access is pending developer token approval.
          </span>
        </div>
      )}

      {report && <AdsOverviewCards data={report.overview} />}

      {report && (
        <div className="space-y-6">
          <AdsSpendChart data={report.daily} />
          <AdsCampaignsTable campaigns={report.campaigns} />
        </div>
      )}
    </div>
  )
}

function AdsSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-28 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-3.5 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
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
