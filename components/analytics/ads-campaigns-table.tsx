'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdsCampaign } from '@/services/google/ads'

interface Props {
  campaigns: AdsCampaign[]
}

type SortKey = 'spend' | 'clicks' | 'ctr' | 'conversions' | 'costPerConversion' | 'roas' | 'phoneCalls'
type SortDir = 'asc' | 'desc'

function SortTh({ label, field, cur, dir, onSort }: {
  label: string; field: string; cur: string; dir: SortDir; onSort: (f: string) => void
}) {
  const active = cur === field
  return (
    <th
      onClick={() => onSort(field)}
      className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
    >
      {label} <span className={`text-[10px] ${active ? '' : 'opacity-30'}`}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )
}

const PAGE_SIZE = 10

export function AdsCampaignsTable({ campaigns }: Props) {
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
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Campaign</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Type</th>
                <SortTh label="Spend" field="spend" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Clicks" field="clicks" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="CTR" field="ctr" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Conv." field="conversions" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Cost/Conv." field="costPerConversion" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Calls" field="phoneCalls" cur={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="ROAS" field="roas" cur={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => (
                <tr key={i} className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs uppercase">{c.type ? c.type.replace('_', ' ') : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">${(c.spend ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{(c.clicks ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{(c.ctr ?? 0).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{(c.conversions ?? 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{(c.costPerConversion ?? 0) > 0 ? `$${c.costPerConversion.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{c.phoneCalls ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${(c.roas ?? 0) >= 4 ? 'text-green-600 dark:text-green-400' : (c.roas ?? 0) >= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(c.roas ?? 0) > 0 ? `${c.roas.toFixed(1)}x` : '—'}
                    </span>
                  </td>
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
