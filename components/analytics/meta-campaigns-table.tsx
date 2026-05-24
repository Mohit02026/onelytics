'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MetaCampaign } from '@/services/meta/ads'

interface Props {
  campaigns: MetaCampaign[]
}

type SortKey = 'spend' | 'reach' | 'impressions' | 'ctr' | 'conversions'
type SortDir = 'asc' | 'desc'

function statusBadge(status: string) {
  if (status === 'ACTIVE')
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-0 text-[10px]">Active</Badge>
  if (status === 'PAUSED')
    return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-0 text-[10px]">Paused</Badge>
  return <Badge variant="outline" className="text-gray-400 text-[10px]">{status}</Badge>
}

function fmt(n: number | null | undefined) {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('en-US')
}

function SortTh({ label, field, cur, dir, onSort }: {
  label: string; field: string; cur: string; dir: SortDir; onSort: (f: string) => void
}) {
  const active = cur === field
  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap"
    >
      {label} <span className={`text-[10px] ${active ? '' : 'opacity-30'}`}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )
}

const PAGE_SIZE = 10

export function MetaCampaignsTable({ campaigns }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [shown, setShown] = useState(PAGE_SIZE)

  function handleSort(field: string) {
    if (field === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(field as SortKey); setSortDir('desc') }
  }

  const sorted = [...campaigns].sort((a, b) => {
    const v = (a[sortKey] ?? 0) - (b[sortKey] ?? 0)
    return sortDir === 'asc' ? v : -v
  })
  const visible = sorted.slice(0, shown)
  const hasMore = shown < sorted.length

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Campaigns</CardTitle>
          <span className="text-xs text-gray-400">Showing {visible.length} of {campaigns.length}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Campaign</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <SortTh label="Spend" field="spend" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Reach" field="reach" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Impr." field="impressions" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="CTR" field="ctr" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Conv." field="conversions" cur={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{c.name}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">${c.spend.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(c.reach)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{fmt(c.impressions)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.ctr.toFixed(2)}%</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{c.conversions}</td>
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
