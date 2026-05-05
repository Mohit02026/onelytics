'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Ga4TopPage, Ga4DeviceRow, Ga4CountryRow } from '@/services/google/ga4'

function fmt(n: number | null | undefined) {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('en-US')
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

export function Ga4TopPagesTable({ pages }: { pages: Ga4TopPage[] }) {
  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Pages</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Page</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Pageviews</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Share</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pages.map((p) => (
                <tr key={p.page} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-3 text-gray-800 dark:text-gray-200 font-mono text-xs max-w-xs truncate">{p.page}</td>
                  <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(p.pageviews)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${p.percentage}%` }} />
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 w-8 text-xs">{p.percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">{formatDuration(p.avgTimeOnPage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function Ga4DeviceCountryBreakdown({ devices, countries }: { devices: Ga4DeviceRow[]; countries: Ga4CountryRow[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Device Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.map((d) => (
            <div key={d.device} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize w-20">{d.device}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${d.percentage}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">{fmt(d.sessions)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{d.percentage}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Countries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {countries.slice(0, 8).map((c) => (
            <div key={c.country} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 w-28 truncate">{c.country}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${c.percentage}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">{fmt(c.sessions)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{c.percentage}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
