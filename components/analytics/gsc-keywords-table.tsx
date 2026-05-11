import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GscKeyword } from '@/services/google/gsc'

interface Props {
  keywords: GscKeyword[]
  volumes?: Record<string, number>
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function positionColor(pos: number) {
  if (pos <= 3) return 'text-green-600 dark:text-green-400'
  if (pos <= 10) return 'text-yellow-600 dark:text-yellow-400'
  if (pos <= 20) return 'text-orange-500 dark:text-orange-400'
  return 'text-gray-500 dark:text-gray-400'
}

function fmtVolume(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function GscKeywordsTable({ keywords, volumes }: Props) {
  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Top Keywords
          </CardTitle>
          <span className="text-xs text-gray-400">Showing {keywords.length} rows</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Keyword</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clicks</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Impressions</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CTR</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Position</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volume</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((k, i) => {
                const notFound = !k.position || k.position === 0
                const vol = volumes?.[k.query.toLowerCase()]
                const change = k.positionChange !== undefined ? Math.round(k.positionChange) : undefined

                return (
                  <tr
                    key={i}
                    className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[260px]">
                      <span className="block truncate">{k.query}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {k.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {k.impressions >= 1000 ? `${(k.impressions / 1000).toFixed(1)}K` : k.impressions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {(k.ctr * 100).toFixed(1)}%
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${notFound ? 'text-gray-400 italic' : positionColor(k.position)}`}>
                      {notFound ? 'not found' : (
                        <span>
                          {Math.round(k.position)}
                          <sup className="text-[9px] font-normal">{ordinal(Math.round(k.position)).slice(String(Math.round(k.position)).length)}</sup>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-sm">
                      {change === undefined || change === 0 ? (
                        <span className="text-gray-400 font-normal">—</span>
                      ) : change > 0 ? (
                        <span className="text-green-600 dark:text-green-400">▲{change}</span>
                      ) : (
                        <span className="text-red-500 dark:text-red-400">▼{Math.abs(change)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                      {vol !== undefined ? fmtVolume(vol) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
