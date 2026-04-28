import { Card, CardContent } from '@/components/ui/card'
import { Users, MousePointerClick, Timer, TrendingDown } from 'lucide-react'
import type { Ga4Overview } from '@/services/google/ga4'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

interface Props {
  data: Ga4Overview
}

export function Ga4OverviewCards({ data }: Props) {
  const cards = [
    {
      label: 'Sessions',
      value: formatNumber(data.sessions),
      icon: MousePointerClick,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Users',
      value: formatNumber(data.users),
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: 'Bounce Rate',
      value: `${data.bounceRate}%`,
      icon: TrendingDown,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: 'Avg. Session',
      value: formatDuration(data.avgSessionDuration),
      icon: Timer,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950',
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
