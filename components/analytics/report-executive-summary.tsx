'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { ReportData } from '@/services/reports/generate'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function fmt(n: number, type: 'money' | 'number' | 'pct' = 'number') {
  if (type === 'money') return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (type === 'pct') return `${n.toFixed(2)}%`
  return n.toLocaleString()
}

interface Props {
  data: ReportData
}

export function ReportExecutiveSummary({ data }: Props) {
  const { executiveSummary: s, momComparisons } = data

  const cards = [
    { label: 'Total Ad Spend', value: fmt(s.totalSpend, 'money'), mom: momComparisons[0] },
    { label: 'Impressions', value: fmt(s.totalImpressions), mom: null },
    { label: 'Clicks', value: fmt(s.totalClicks), mom: null },
    { label: 'Conversions', value: fmt(s.totalConversions), mom: momComparisons[1] },
    { label: 'Avg CTR', value: fmt(s.avgCtr, 'pct'), mom: null },
    { label: 'Avg CPA', value: fmt(s.avgCpa, 'money'), mom: null },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardContent className="pt-5 pb-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{c.value}</p>
              {c.mom && (
                <p className={`text-xs mt-1 flex items-center gap-0.5 ${c.mom.delta > 0 ? 'text-green-600' : c.mom.delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {c.mom.delta > 0 ? <TrendingUp className="w-3 h-3" /> : c.mom.delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {c.mom.delta > 0 ? '+' : ''}{c.mom.delta}% vs prev
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data.aiNarrative && (
        <Card className="dark:bg-gray-900 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">
              AI Executive Summary
            </p>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2 whitespace-pre-line">
              {data.aiNarrative}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
