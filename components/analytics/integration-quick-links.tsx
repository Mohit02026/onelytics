import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3, Activity, Search, Globe, Share2, ArrowRight, Plug } from 'lucide-react'
import type { UnifiedReport } from '@/app/api/analytics/unified/route'

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-US')
}

interface Props {
  report: UnifiedReport
}

export function IntegrationQuickLinks({ report }: Props) {
  const items = [
    {
      href: '/ga4',
      icon: BarChart3,
      label: 'Google Analytics',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-950',
      stat: report.connected.google ? `${fmt(report.sessions)} sessions` : 'Not connected',
      connected: report.connected.google,
    },
    {
      href: '/google-ads',
      icon: Activity,
      label: 'Google Ads',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950',
      stat: report.connected.google ? `$${fmt(report.googleAdSpend)} spend` : 'Not connected',
      connected: report.connected.google,
    },
    {
      href: '/search-console',
      icon: Search,
      label: 'Search Console',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950',
      stat: report.connected.gsc ? `${fmt(report.organicClicks)} clicks` : 'Not connected',
      connected: report.connected.gsc,
    },
    {
      href: '/meta-ads',
      icon: Share2,
      label: 'Meta Ads',
      color: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-50 dark:bg-pink-950',
      stat: report.connected.meta ? `$${fmt(report.metaAdSpend)} spend` : 'Not connected',
      connected: report.connected.meta,
    },
    {
      href: '/wordpress',
      icon: Globe,
      label: 'WordPress',
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950',
      stat: report.connected.wordpress ? 'Connected' : 'Not connected',
      connected: report.connected.wordpress,
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Integrations</h3>
        <Link href="/connect" className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
          <Plug className="w-3 h-3" /> Manage
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className={`dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer ${!item.connected ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white mb-0.5">{item.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.stat}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
