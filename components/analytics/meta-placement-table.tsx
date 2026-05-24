'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MetaPlacement } from '@/services/meta/ads'

interface Props {
  placements: MetaPlacement[]
}

type SortKey = 'spend' | 'impressions' | 'clicks' | 'conversions'
type SortDir = 'asc' | 'desc'

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
  feed: 'Feed', stream: 'Feed', right_hand_column: 'Right Column',
  instant_article: 'Instant Article', marketplace: 'Marketplace',
  story: 'Story', reels: 'Reels', search: 'Search',
  video_feeds: 'Video Feeds', profile_feed: 'Profile Feed',
  explore: 'Explore',
}

function SortTh({ label, field, cur, dir, onSort }: {
  label: string; field: string; cur: string; dir: SortDir; onSort: (f: string) => void
}) {
  const active = cur === field
  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
    >
      {label} <span className={`text-[10px] ${active ? '' : 'opacity-30'}`}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )
}

const PAGE_SIZE = 10

export function MetaPlacementTable({ placements }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [shown, setShown] = useState(PAGE_SIZE)

  if (placements.length === 0) return null

  function handleSort(field: string) {
    if (field === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(field as SortKey); setSortDir('desc') }
  }

  const totalSpend = placements.reduce((s, p) => s + p.spend, 0)
  const sorted = [...placements].sort((a, b) => {
    const v = (a[sortKey] ?? 0) - (b[sortKey] ?? 0)
    return sortDir === 'asc' ? v : -v
  })
  const visible = sorted.slice(0, shown)
  const hasMore = shown < sorted.length

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Placement Breakdown</CardTitle>
          <span className="text-xs text-gray-400">Showing {visible.length} of {placements.length}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Platform</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Position</th>
                <SortTh label="Spend" field="spend" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Share</th>
                <SortTh label="Impressions" field="impressions" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Clicks" field="clicks" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Conv." field="conversions" cur={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr key={i} className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white capitalize">{PLATFORM_LABELS[p.platform] ?? p.platform}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{POSITION_LABELS[p.position] ?? p.position}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">${p.spend.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{totalSpend > 0 ? `${((p.spend / totalSpend) * 100).toFixed(1)}%` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(p.impressions)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(p.clicks)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.conversions > 0 ? p.conversions.toFixed(1) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
            <button onClick={() => setShown(s => s + PAGE_SIZE)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Show more ({sorted.length - shown} remaining)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
