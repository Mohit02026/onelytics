'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LinkedInDemographic } from '@/services/linkedin/ads'

function fmt(n: number | null | undefined) {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString('en-US')
}

interface Props {
  jobFunctions: LinkedInDemographic[]
  seniority: LinkedInDemographic[]
}

export function LinkedInDemographics({ jobFunctions, seniority }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Job Function Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {jobFunctions.map((d) => (
            <div key={d.segment} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 w-40 truncate">{d.segment}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${d.percentage}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">{fmt(d.impressions)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{d.percentage}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Seniority Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {seniority.map((d) => (
            <div key={d.segment} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 dark:text-gray-300 w-28 truncate">{d.segment}</span>
              <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${d.percentage}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-16 text-right">{fmt(d.impressions)}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">{d.percentage}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
