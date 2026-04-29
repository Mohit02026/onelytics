'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, defaultDateRange } from '@/components/analytics/date-range-picker'
import { UnifiedStats } from '@/components/analytics/unified-stats'
import { SpendBreakdownChart } from '@/components/analytics/spend-breakdown-chart'
import { AiSummaryWidget } from '@/components/analytics/ai-summary-widget'
import { IntegrationQuickLinks } from '@/components/analytics/integration-quick-links'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus, Plug } from 'lucide-react'
import Link from 'next/link'
import type { DateRange } from '@/components/analytics/date-range-picker'
import type { UnifiedReport } from '@/app/api/analytics/unified/route'

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [report, setReport] = useState<UnifiedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchReport = useCallback(async (range: DateRange) => {
    setRefreshing(true)
    try {
      const res = await fetch(
        `/api/analytics/unified?startDate=${range.startDate}&endDate=${range.endDate}`
      )
      if (res.ok) setReport(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchReport(dateRange) }, [dateRange, fetchReport])

  const nothingConnected = report &&
    !report.connected.google && !report.connected.meta &&
    !report.connected.wordpress && !report.connected.gsc

  if (loading) return <DashboardSkeleton />

  // Onboarding state — nothing connected yet
  if (nothingConnected) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">O</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Onelytics
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          Your unified marketing dashboard. Connect your first integration to start seeing all your analytics in one place.
        </p>
        <Button render={<Link href="/connect" />} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plug className="w-4 h-4 mr-2" />
          Connect Integrations
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cross-platform marketing performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => fetchReport(dateRange)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button render={<Link href="/connect" />} variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Connect
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      {report && <UnifiedStats data={report} />}

      {/* Spend chart + AI summary */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SpendBreakdownChart data={report.dailySpend} connected={report.connected} />
          </div>
          <div>
            <AiSummaryWidget report={report} />
          </div>
        </div>
      )}

      {/* Integration quick links */}
      {report && <IntegrationQuickLinks report={report} />}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-3.5 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
