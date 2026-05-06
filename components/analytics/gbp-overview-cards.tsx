import { Card, CardContent } from '@/components/ui/card'
import { Eye, PhoneCall, MousePointerClick, Star, Navigation } from 'lucide-react'
import type { GbpReport } from '@/services/google/gbp'

function fmt(n: number | null | undefined) {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('en-US')
}

interface Props {
  data: GbpReport['overview']
}

export function GbpOverviewCards({ data }: Props) {
  const cards = [
    {
      label: 'Total Views',
      value: fmt(data.totalViews),
      icon: Eye,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950',
      sub: `${fmt(data.mapViews)} maps · ${fmt(data.searchViews)} search`,
    },
    {
      label: 'Calls',
      value: fmt(data.calls),
      icon: PhoneCall,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Website Clicks',
      value: fmt(data.websiteClicks),
      icon: MousePointerClick,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Direction Requests',
      value: fmt(data.directionRequests),
      icon: Navigation,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: 'Avg Rating',
      value: data.avgRating > 0 ? data.avgRating.toFixed(1) : '—',
      icon: Star,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      sub: data.totalReviews > 0 ? `${data.totalReviews} reviews` : undefined,
    },
    {
      label: 'Total Reviews',
      value: data.totalReviews > 0 ? fmt(data.totalReviews) : '—',
      icon: Star,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-950',
    },
  ]

  // We only show 5 cards in a row usually, let's group or just show 5
  // We can drop Total Reviews as its own card since it's in Avg Rating sub, or keep it. Let's make it 6 columns on lg.

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
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
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ml-2 ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
