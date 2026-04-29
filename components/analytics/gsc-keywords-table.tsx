import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GscKeyword } from '@/services/google/gsc'

interface Props {
  keywords: GscKeyword[]
}

function positionColor(pos: number) {
  if (pos <= 3) return 'text-green-600 dark:text-green-400'
  if (pos <= 10) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-gray-600 dark:text-gray-300'
}

export function GscKeywordsTable({ keywords }: Props) {
  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Top Keywords
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Query', 'Clicks', 'Impressions', 'CTR', 'Position'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keywords.map((k, i) => (
                <tr
                  key={i}
                  className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[220px]">
                    {k.query}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {k.clicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {k.impressions >= 1000
                      ? `${(k.impressions / 1000).toFixed(1)}K`
                      : k.impressions}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {(k.ctr * 100).toFixed(1)}%
                  </td>
                  <td className={`px-4 py-3 font-semibold ${positionColor(k.position)}`}>
                    {k.position.toFixed(1)}
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
