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
import { Loader2, ArrowLeft, Calendar } from 'lucide-react'

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
    </div>
  )
}
