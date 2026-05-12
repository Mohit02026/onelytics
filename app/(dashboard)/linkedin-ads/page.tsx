'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LinkedInOverviewCards } from '@/components/analytics/linkedin-overview-cards'
import { LinkedInSpendChart } from '@/components/analytics/linkedin-spend-chart'
import { LinkedInCampaignsTable } from '@/components/analytics/linkedin-campaigns-table'
import { LinkedInDemographics } from '@/components/analytics/linkedin-demographics'
import { DateRangePicker } from '@/components/analytics/date-range-picker'
import { ExportPdfButton } from '@/components/analytics/export-pdf-button'
import type { LinkedInReport } from '@/services/linkedin/ads'
import { Loader2, Briefcase } from 'lucide-react'

function skeleton(cls: string) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${cls}`} />
}

export default function LinkedInAdsPage() {
  const [range, setRange] = useState({ startDate: '', endDate: '', label: 'Last 30 days' })
  const [report, setReport] = useState<LinkedInReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(end.getDate() - 29)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    setRange({ startDate: fmt(start), endDate: fmt(end), label: 'Last 30 days' })
  }, [])

  useEffect(() => {
    if (!range.startDate) return
    setLoading(true)
    setNotConnected(false)
    fetch(`/api/analytics/linkedin?startDate=${range.startDate}&endDate=${range.endDate}`)
      .then((r) => {
        if (r.status === 404) { setNotConnected(true); return null }
        return r.json()
      })
      .then((d) => { if (d) setReport(d) })
      .finally(() => setLoading(false))
  }, [range.startDate, range.endDate])

  if (notConnected) {
    return (
      <div className="max-w-4xl mx-auto py-16 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
          <Briefcase className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">LinkedIn Ads not connected</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Connect your LinkedIn Campaign Manager to see B2B ad performance: spend, impressions, clicks, and conversions.
        </p>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => (window.location.href = '/connect')}
        >
          Connect LinkedIn Ads
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">LinkedIn Ads</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">B2B campaign performance</p>
        </div>
        <ExportPdfButton platform="linkedin" startDate={range.startDate} endDate={range.endDate} />
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Overview cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="dark:bg-gray-900"><CardContent className="pt-6 space-y-2">{skeleton('h-3 w-20')}{skeleton('h-7 w-28')}{skeleton('h-3 w-16')}</CardContent></Card>
          ))}
        </div>
      ) : report ? (
        <LinkedInOverviewCards data={report.overview} />
      ) : null}

      {/* Spend chart */}
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Daily Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? skeleton('h-64 w-full') : report ? <LinkedInSpendChart data={report.daily} /> : null}
        </CardContent>
      </Card>

      {/* Campaigns table */}
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => skeleton(`h-4 w-full ${i % 2 ? 'opacity-60' : ''}`))} </div>
          ) : report ? (
            <LinkedInCampaignsTable campaigns={report.campaigns} />
          ) : null}
        </CardContent>
      </Card>

      {/* Demographic breakdowns */}
      {!loading && report && (
        report.jobFunctionBreakdown?.length > 0 || report.seniorityBreakdown?.length > 0
      ) && (
        <LinkedInDemographics
          jobFunctions={report?.jobFunctionBreakdown ?? []}
          seniority={report?.seniorityBreakdown ?? []}
        />
      )}

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading LinkedIn data…
        </div>
      )}
    </div>
  )
}
