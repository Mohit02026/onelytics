'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { TikTokOverview } from '@/services/tiktok/ads'

function fmt(n: number, type: 'money' | 'number' | 'pct' = 'number') {
  if (type === 'money') return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (type === 'pct') return `${n.toFixed(2)}%`
  return n.toLocaleString()
}

interface Props {
  data: TikTokOverview
}

export function TikTokOverviewCards({ data }: Props) {
  const cards = [
    { label: 'Total Spend', value: fmt(data.spend, 'money'), sub: 'Ad spend' },
    { label: 'Impressions', value: fmt(data.impressions), sub: `CPM ${fmt(data.cpm, 'money')}` },
    { label: 'Clicks', value: fmt(data.clicks), sub: `CTR ${fmt(data.ctr, 'pct')}` },
    { label: 'Conversions', value: fmt(data.conversions), sub: `CPA ${fmt(data.cpa, 'money')}` },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
