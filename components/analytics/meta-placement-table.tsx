'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MetaPlacement } from '@/services/meta/ads'

interface Props {
  placements: MetaPlacement[]
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  audience_network: 'Audience Network',
  messenger: 'Messenger',
}

const POSITION_LABELS: Record<string, string> = {
  feed: 'Feed',
  stream: 'Feed',
  right_hand_column: 'Right Column',
  instant_article: 'Instant Article',
  marketplace: 'Marketplace',
  story: 'Story',
  reels: 'Reels',
  search: 'Search',
  video_feeds: 'Video Feeds',
  profile_feed: 'Profile Feed',
  explore: 'Explore',
}

export function MetaPlacementTable({ placements }: Props) {
  if (placements.length === 0) return null

  const totalSpend = placements.reduce((s, p) => s + p.spend, 0)

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Placement Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                {['Platform', 'Position', 'Spend', 'Share', 'Impressions', 'Clicks', 'Conv.'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {placements
                .sort((a, b) => b.spend - a.spend)
                .map((p, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white capitalize">
                      {PLATFORM_LABELS[p.platform] ?? p.platform}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {POSITION_LABELS[p.position] ?? p.position}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">${p.spend.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {totalSpend > 0 ? `${((p.spend / totalSpend) * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(p.impressions)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(p.clicks)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.conversions > 0 ? p.conversions.toFixed(1) : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
