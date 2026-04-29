import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Users, Eye, TrendingUp } from 'lucide-react'
import type { MetaOverview } from '@/services/meta/ads'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-US')
}

interface Props {
  data: MetaOverview
}

export function MetaOverviewCards({ data }: Props) {
  const cards = [
    {
      label: 'Ad Spend',
      value: `$${fmt(data.spend)}`,
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950',
      sub: `CPM $${data.cpm.toFixed(2)}`,
    },
    {
      label: 'Reach',
      value: fmt(data.reach),
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: 'Impressions',
      value: fmt(data.impressions),
      icon: Eye,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950',
      sub: `CTR ${data.ctr.toFixed(2)}%`,
    },
    {
      label: 'Conversions',
      value: fmt(data.conversions),
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950',
      sub: data.clicks > 0 ? `${((data.conversions / data.clicks) * 100).toFixed(1)}% conv. rate` : undefined,
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
