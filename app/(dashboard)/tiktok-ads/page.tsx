'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TikTokOverviewCards } from '@/components/analytics/tiktok-overview-cards'
import { TikTokSpendChart } from '@/components/analytics/tiktok-spend-chart'
import { TikTokCampaignsTable } from '@/components/analytics/tiktok-campaigns-table'
import { DateRangePicker } from '@/components/analytics/date-range-picker'
import type { TikTokReport } from '@/services/tiktok/ads'
import { Loader2, Music2 } from 'lucide-react'

function skeleton(cls: string) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${cls}`} />
}

export default function TikTokAdsPage() {
  const [range, setRange] = useState({ startDate: '', endDate: '', label: 'Last 30 days' })
  const [report, setReport] = useState<TikTokReport | null>(null)
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
    fetch(`/api/analytics/tiktok?startDate=${range.startDate}&endDate=${range.endDate}`)
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
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
          <Music2 className="w-8 h-8 text-teal-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">TikTok Ads not connected</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Connect your TikTok Ads account to see spend, impressions, clicks, and campaign performance.
        </p>
        <Button
          className="bg-teal-500 hover:bg-teal-600 text-white"
          onClick={() => (window.location.href = '/connect')}
        >
          Connect TikTok Ads
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">TikTok Ads</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Performance across campaigns</p>
        </div>
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
        <TikTokOverviewCards data={report.overview} />
      ) : null}

      {/* Spend chart */}
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base">Daily Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? skeleton('h-64 w-full') : report ? <TikTokSpendChart data={report.daily} /> : null}
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
            <TikTokCampaignsTable campaigns={report.campaigns} />
          ) : null}
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading TikTok data…
        </div>
      )}
    </div>
  )
}
