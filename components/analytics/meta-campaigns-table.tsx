import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MetaCampaign } from '@/services/meta/ads'

interface Props {
  campaigns: MetaCampaign[]
}

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

export function MetaCampaignsTable({ campaigns }: Props) {
  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Campaign', 'Status', 'Spend', 'Reach', 'Impr.', 'CTR', 'Conv.'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                    {c.name}
                  </td>
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
      </CardContent>
    </Card>
  )
}
