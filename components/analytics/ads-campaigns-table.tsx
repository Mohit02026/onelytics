import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdsCampaign } from '@/services/google/ads'

interface Props {
  campaigns: AdsCampaign[]
}

export function AdsCampaignsTable({ campaigns }: Props) {
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
                {['Campaign', 'Spend', 'Clicks', 'Impr.', 'CPC', 'ROAS'].map((h) => (
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
              {campaigns.map((c, i) => (
                <tr
                  key={i}
                  className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">${c.spend.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {c.impressions >= 1000
                      ? `${(c.impressions / 1000).toFixed(1)}K`
                      : c.impressions}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">${c.cpc.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        c.roas >= 4
                          ? 'text-green-600 dark:text-green-400'
                          : c.roas >= 2
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {c.roas.toFixed(1)}x
                    </span>
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
