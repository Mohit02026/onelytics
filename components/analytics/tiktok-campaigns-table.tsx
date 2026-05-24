'use client'

import { useState } from 'react'
import type { TikTokCampaign } from '@/services/tiktok/ads'

interface Props {
  campaigns: TikTokCampaign[]
}

type SortKey = 'spend' | 'impressions' | 'clicks' | 'ctr' | 'reach' | 'videoViews' | 'conversions' | 'roas'
type SortDir = 'asc' | 'desc'

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ENABLE' || status === 'ACTIVE'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isActive ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
      {isActive ? 'Active' : 'Paused'}
    </span>
  )
}

function SortTh({ label, field, cur, dir, onSort }: {
  label: string; field: string; cur: string; dir: SortDir; onSort: (f: string) => void
}) {
  const active = cur === field
  return (
    <th
      onClick={() => onSort(field)}
      className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 whitespace-nowrap"
    >
      {label} <span className={`text-[10px] ${active ? '' : 'opacity-30'}`}>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</span>
    </th>
  )
}

const PAGE_SIZE = 10

export function TikTokCampaignsTable({ campaigns }: Props) {
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
    <div>
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-xs text-gray-400">Showing {visible.length} of {campaigns.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Campaign</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <SortTh label="Spend" field="spend" cur={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Impressions" field="impressions" cur={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Clicks" field="clicks" cur={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="CTR" field="ctr" cur={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Reach" field="reach" cur={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Video Views" field="videoViews" cur={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Conversions" field="conversions" cur={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="ROAS" field="roas" cur={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900 dark:text-white max-w-[220px] truncate">{c.name}</td>
                <td className="py-3 px-4 text-right"><StatusBadge status={c.status} /></td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">${c.spend.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{c.impressions.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{c.clicks.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{c.ctr.toFixed(2)}%</td>
                <td className="py-3 px-4 text-right text-gray-500 dark:text-gray-400">{(c.reach ?? 0).toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-gray-500 dark:text-gray-400">{(c.videoViews ?? 0).toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{c.conversions.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{(c.roas ?? 0) > 0 ? `${c.roas.toFixed(2)}x` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="py-3 border-t border-gray-100 dark:border-gray-800 text-center">
          <button onClick={() => setShown(s => s + PAGE_SIZE)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Show more ({sorted.length - shown} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
