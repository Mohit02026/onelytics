'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { LinkedInOverview } from '@/services/linkedin/ads'

function fmt(n: number | null | undefined, type: 'money' | 'number' | 'pct' = 'number') {
  const v = n ?? 0
  if (type === 'money') return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (type === 'pct') return `${v.toFixed(2)}%`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

interface Props {
  data: LinkedInOverview
}

export function LinkedInOverviewCards({ data }: Props) {
  const cards = [
    { label: 'Total Spend', value: fmt(data.spend, 'money'), sub: `CPM ${fmt(data.cpm, 'money')}` },
    { label: 'Impressions', value: fmt(data.impressions), sub: `CTR ${fmt(data.ctr, 'pct')}` },
    { label: 'Clicks', value: fmt(data.clicks), sub: `Conversions ${fmt(data.conversions)}` },
    { label: 'Engagement Rate', value: fmt(data.engagementRate, 'pct'), sub: 'Likes + comments + shares' },
    { label: 'Likes', value: fmt(data.likes), sub: `Comments ${fmt(data.comments)}` },
    { label: 'Shares', value: fmt(data.shares), sub: `Follows ${fmt(data.follows)}` },
    { label: 'Cost / Conv.', value: fmt(data.costPerConversion, 'money'), sub: 'Cost per conversion' },
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
