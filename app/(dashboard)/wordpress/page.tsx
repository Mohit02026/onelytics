'use client'

import { useEffect, useState, useCallback } from 'react'
import { DateRangePicker, defaultDateRange } from '@/components/analytics/date-range-picker'
import { WpOverviewCards } from '@/components/analytics/wp-overview-cards'
import { WpPostsTable } from '@/components/analytics/wp-posts-table'
import { WpCategoriesTable } from '@/components/analytics/wp-categories-table'
import { Button } from '@/components/ui/button'
import { ExportPdfButton } from '@/components/analytics/export-pdf-button'
import { Globe, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { DateRange } from '@/components/analytics/date-range-picker'
import type { WpReport } from '@/services/wordpress'

type Status = 'loading' | 'not-connected' | 'invalid-credentials' | 'error' | 'loaded'

export default function WordPressPage() {
  const [status, setStatus] = useState<Status>('loading')
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange)
  const [report, setReport] = useState<WpReport | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchReport = useCallback(async (range: DateRange) => {
    setRefreshing(true)
    try {
      const res = await fetch(
        `/api/analytics/wordpress?startDate=${range.startDate}&endDate=${range.endDate}`
      )
      if (res.status === 404) { setStatus('not-connected'); return }
      if (res.status === 401) { setStatus('invalid-credentials'); return }
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

  if (status === 'loading') return <WpSkeleton />

  if (status === 'not-connected') {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6">
          <Globe className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          WordPress not connected
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          Connect your WordPress site to track posts, drafts, and comment activity.
        </p>
        <Button render={<Link href="/connect" />} className="bg-blue-600 hover:bg-blue-700 text-white">
          Go to Connect
        </Button>
      </div>
    )
  }

  if (status === 'invalid-credentials') {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          WordPress credentials invalid
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          The username or application password stored for your WordPress site is incorrect or has been revoked. Reconnect to update your credentials.
        </p>
        <Button render={<Link href="/connect" />} className="bg-blue-600 hover:bg-blue-700 text-white">
          Reconnect WordPress
        </Button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 text-red-600 dark:text-red-400 p-6">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load WordPress data. Check that your site URL is correct and the REST API is accessible.</span>
        <Button variant="outline" size="sm" onClick={() => fetchReport(dateRange)}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">WordPress</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Posts, drafts, and content activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => fetchReport(dateRange)} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <ExportPdfButton platform="wordpress" startDate={dateRange.startDate} endDate={dateRange.endDate} />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {report && <WpOverviewCards data={report.overview} />}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WpPostsTable posts={report.recentPosts} />
          {report.categories?.length > 0 && <WpCategoriesTable categories={report.categories} />}
        </div>
      )}
    </div>
  )
}

function WpSkeleton() {
  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-28 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-3.5 w-44 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-56 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
    </div>
  )
}
