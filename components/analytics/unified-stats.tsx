import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, MousePointerClick, Eye, Search, Target, Building2 } from 'lucide-react'
import type { UnifiedReport } from '@/app/api/analytics/unified/route'

function fmt(n: number | null | undefined) {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('en-US')
}

function buildSpendSub(data: UnifiedReport): string | undefined {
  const parts: string[] = []
  if (data.googleAdSpend > 0) parts.push(`Google $${fmt(data.googleAdSpend)}`)
  if (data.metaAdSpend > 0) parts.push(`Meta $${fmt(data.metaAdSpend)}`)
  if (data.tiktokAdSpend > 0) parts.push(`TikTok $${fmt(data.tiktokAdSpend)}`)
  if (data.linkedinAdSpend > 0) parts.push(`LinkedIn $${fmt(data.linkedinAdSpend)}`)
  return parts.length > 1 ? parts.join(' · ') : undefined
}

function DeltaBadge({ delta }: { delta: number | undefined }) {
  if (delta === undefined || delta === 0) return null
  const isPositive = delta > 0
  return (
    <span className={`inline-flex items-center text-xs font-medium ml-2 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {isPositive ? '▲' : '▼'} {Math.abs(delta)}%
    </span>
  )
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
      sub: buildSpendSub(data),
      delta: data.momDeltas?.totalAdSpend,
    },
    {
      label: 'Paid Impressions',
      value: fmt(data.totalImpressions),
      icon: Eye,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950',
      sub: data.totalClicks > 0 ? `${fmt(data.totalClicks)} clicks` : undefined,
      delta: data.momDeltas?.totalImpressions,
    },
    {
      label: 'Conversions',
      value: data.totalConversions > 0 ? fmt(data.totalConversions) : '—',
      icon: Target,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950',
      sub: data.googleRoas > 0 ? `Google ROAS ${data.googleRoas.toFixed(2)}x` : undefined,
      delta: data.momDeltas?.totalConversions,
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
      delta: data.connected.gsc ? data.momDeltas?.organicClicks : undefined,
    },
    {
      label: 'Sessions',
      value: data.connected.google ? fmt(data.sessions) : '—',
      icon: MousePointerClick,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950',
      sub: data.connected.google ? undefined : 'GA4 not connected',
      delta: data.connected.google ? data.momDeltas?.sessions : undefined,
    },
  ]

  if (data.connected.gbp) {
    cards.push({
      label: 'Profile Views',
      value: fmt(data.gbpTotalViews),
      icon: Building2,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950',
      sub: data.gbpCalls > 0 ? `${fmt(data.gbpCalls)} phone calls` : undefined,
      delta: undefined,
    })
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${cards.length} gap-4`}>
      {cards.map((card) => (
        <Card key={card.label} className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 whitespace-nowrap">
                  {card.label}
                </p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  <DeltaBadge delta={card.delta} />
                </div>
                {card.sub && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[120px] lg:max-w-none">{card.sub}</p>
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
