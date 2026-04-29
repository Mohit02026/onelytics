import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, MousePointerClick, Eye, Search } from 'lucide-react'
import type { UnifiedReport } from '@/app/api/analytics/unified/route'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-US')
}

interface Props {
  data: UnifiedReport
}

export function UnifiedStats({ data }: Props) {
  const cards = [
    {
      label: 'Total Ad Spend',
      value: `$${fmt(data.totalAdSpend)}`,
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950',
      sub: data.googleAdSpend > 0 && data.metaAdSpend > 0
        ? `Google $${fmt(data.googleAdSpend)} · Meta $${fmt(data.metaAdSpend)}`
        : undefined,
    },
    {
      label: 'Paid Impressions',
      value: fmt(data.totalImpressions),
      icon: Eye,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950',
      sub: data.totalClicks > 0 ? `${fmt(data.totalClicks)} clicks` : undefined,
    },
    {
      label: 'Organic Clicks',
      value: data.connected.gsc ? fmt(data.organicClicks) : '—',
      icon: Search,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950',
      sub: data.connected.gsc && data.avgPosition > 0
        ? `avg position ${data.avgPosition.toFixed(1)}`
        : data.connected.gsc ? undefined : 'Search Console not connected',
    },
    {
      label: 'Sessions',
      value: data.connected.google ? fmt(data.sessions) : '—',
      icon: MousePointerClick,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950',
      sub: data.connected.google ? undefined : 'GA4 not connected',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {card.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                {card.sub && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.sub}</p>
                )}
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
