'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GscPage, GscDevice, GscCountry } from '@/services/google/gsc'

function fmt(n: number | null | undefined) {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('en-US')
}

export function GscTopPagesTable({ pages }: { pages: GscPage[] }) {
  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Pages (Search)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Page</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Clicks</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Impressions</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">CTR</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-3">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pages.map((p) => (
                <tr key={p.page} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-3 text-gray-800 dark:text-gray-200 font-mono text-xs max-w-xs truncate">{p.page}</td>
                  <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(p.clicks)}</td>
                  <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400">{fmt(p.impressions)}</td>
                  <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-300">{(p.ctr * 100).toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.position <= 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      p.position <= 10 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>{p.position.toFixed(1)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export function GscDeviceCountryBreakdown({ devices, countries }: { devices: GscDevice[]; countries: GscCountry[] }) {
  const totalClicks = devices.reduce((s, d) => s + d.clicks, 0)
  const totalCountryClicks = countries.reduce((s, c) => s + c.clicks, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Device Split (Search)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.map((d) => {
            const pct = totalClicks > 0 ? Math.round((d.clicks / totalClicks) * 100) : 0
            return (
              <div key={d.device} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize w-24">{d.device.toLowerCase()}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">{fmt(d.clicks)}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{pct}%</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Countries (Search)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {countries.slice(0, 8).map((c) => {
            const pct = totalCountryClicks > 0 ? Math.round((c.clicks / totalCountryClicks) * 100) : 0
            return (
              <div key={c.country} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 w-16 truncate uppercase text-xs">{c.country}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">{fmt(c.clicks)}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{pct}%</span>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
