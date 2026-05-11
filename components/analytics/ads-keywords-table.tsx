'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdsKeyword } from '@/services/google/ads'

interface Props {
  keywords: AdsKeyword[]
  volumes?: Record<string, number>
}

const MATCH_BADGE: Record<string, string> = {
  EXACT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  PHRASE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  BROAD: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  SEARCH_TERM: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
}

const PAGE_SIZE = 50

function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(2)}%`
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function QsBar({ score }: { score: number }) {
  const color = score >= 8 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-gray-700 dark:text-gray-300 tabular-nums">{score}</span>
      <span className="flex gap-px">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`inline-block w-1 h-2.5 rounded-[1px] ${i < score ? color : 'bg-gray-200 dark:bg-gray-700'}`}
          />
        ))}
      </span>
    </span>
  )
}

export function AdsKeywordsTable({ keywords, volumes }: Props) {
  const [shown, setShown] = useState(PAGE_SIZE)

  if (keywords.length === 0) {
    return (
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
            No keyword data found for this period. This can happen with Performance Max campaigns or if no keywords had activity in the selected date range.
          </p>
        </CardContent>
      </Card>
    )
  }

  const visible = keywords.slice(0, shown)
  const hasMore = shown < keywords.length

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Keywords</CardTitle>
          <span className="text-xs text-gray-400">Showing {visible.length} of {keywords.length}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keyword</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">View Conv.</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Avg CPC</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clicks</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Conv. Rate</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Conv.</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Cost/Conv.</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Impressions</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Imp. Share</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volume</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Quality</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((k, i) => (
                <tr
                  key={i}
                  className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${MATCH_BADGE[k.matchType ?? ''] ?? MATCH_BADGE.BROAD}`}
                      >
                        {(k.matchType ?? 'B').charAt(0)}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white truncate">{k.keyword ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                    {k.viewThroughConversions > 0 ? k.viewThroughConversions.toFixed(0) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmtMoney(k.avgCpc)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmtNum(k.clicks)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmtPct(k.conversionRate)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{k.conversions.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmtMoney(k.cost)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                    {k.costPerConversion > 0 ? fmtMoney(k.costPerConversion) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{fmtNum(k.impressions)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                    {k.searchImpressionShare !== null ? fmtPct(k.searchImpressionShare) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                    {volumes?.[k.keyword?.toLowerCase() ?? ''] !== undefined
                      ? fmtNum(volumes[k.keyword.toLowerCase()])
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {k.qualityScore !== null ? <QsBar score={k.qualityScore} /> : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-center">
            <button
              onClick={() => setShown((s) => s + PAGE_SIZE)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Show more ({keywords.length - shown} remaining)
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
