'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, defaultDateRange } from '@/components/analytics/date-range-picker'
import { Ga4OverviewCards } from '@/components/analytics/overview-cards'
import { SessionsChart } from '@/components/analytics/sessions-chart'
import { TrafficSourcesChart } from '@/components/analytics/traffic-sources-chart'
import { Ga4TopPagesTable, Ga4DeviceCountryBreakdown } from '@/components/analytics/ga4-breakdowns'
import { Button } from '@/components/ui/button'
import { BarChart3, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { DateRange } from '@/components/analytics/date-range-picker'
import type { Ga4Report } from '@/services/google/ga4'

type Status = 'loading' | 'not-connected' | 'error' | 'loaded'

export default function Ga4Page() {
  const [status, setStatus] = useState<Status>('loading')
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [report, setReport] = useState<Ga4Report | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchReport = useCallback(
    async (range: DateRange) => {
      setRefreshing(true)
      try {
        const res = await fetch(
          `/api/analytics/ga4?startDate=${range.startDate}&endDate=${range.endDate}`
        )
        if (res.status === 404) {
          setStatus('not-connected')
          return
        }
        if (!res.ok) throw new Error('Failed to fetch')
        const data: Ga4Report = await res.json()
        setReport(data)
        setStatus('loaded')
      } catch {
        setStatus('error')
      } finally {
        setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchReport(dateRange)
  }, [dateRange, fetchReport])

  if (status === 'loading') {
    return <Ga4Skeleton />
  }

  if (status === 'not-connected') {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 rounded-2xl flex items-center justify-center mb-6">
          <BarChart3 className="w-7 h-7 text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Google Analytics not connected
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          Connect your Google account to start seeing GA4 data in this dashboard.
        </p>
        <Button
          render={<Link href="/connect" />}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Connect Google Analytics
        </Button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 text-red-600 dark:text-red-400 p-6">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load analytics data. Try refreshing.</span>
        <Button variant="outline" size="sm" onClick={() => fetchReport(dateRange)}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Google Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Website traffic and user behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => fetchReport(dateRange)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Overview cards */}
      {report && <Ga4OverviewCards data={report.overview} />}

      {/* Charts */}
      {report && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SessionsChart data={report.daily} />
          </div>
          <div>
            <TrafficSourcesChart data={report.trafficSources} />
          </div>
        </div>
      )}

      {/* Top pages */}
      {report?.topPages && report.topPages.length > 0 && (
        <Ga4TopPagesTable pages={report.topPages} />
      )}

      {/* Device + country breakdowns */}
      {report && (report.deviceBreakdown?.length > 0 || report.countryBreakdown?.length > 0) && (
        <Ga4DeviceCountryBreakdown
          devices={report.deviceBreakdown ?? []}
          countries={report.countryBreakdown ?? []}
        />
      )}
    </div>
  )
}

function Ga4Skeleton() {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-3.5 w-52 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-80 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
