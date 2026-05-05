'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { TikTokOverview } from '@/services/tiktok/ads'

function fmt(n: number | null | undefined, type: 'money' | 'number' | 'pct' | 'x' = 'number') {
  const v = n ?? 0
  if (type === 'money') return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (type === 'pct') return `${v.toFixed(2)}%`
  if (type === 'x') return `${v.toFixed(2)}x`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

interface Props {
  data: TikTokOverview
}

export function TikTokOverviewCards({ data }: Props) {
  const cards = [
    { label: 'Total Spend', value: fmt(data.spend, 'money'), sub: `CPM ${fmt(data.cpm, 'money')}` },
    { label: 'Impressions', value: fmt(data.impressions), sub: `Reach ${fmt(data.reach)}` },
    { label: 'Frequency', value: fmt(data.frequency, 'pct').replace('%', '×'), sub: 'Avg impressions per person' },
    { label: 'Clicks', value: fmt(data.clicks), sub: `CTR ${fmt(data.ctr, 'pct')}` },
    { label: 'Video Views', value: fmt(data.videoViews), sub: `View rate ${fmt(data.videoViewRate, 'pct')}` },
    { label: 'Conversions', value: fmt(data.conversions), sub: `CPA ${fmt(data.cpa, 'money')}` },
    { label: 'ROAS', value: fmt(data.roas, 'x'), sub: 'Return on ad spend' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{c.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
