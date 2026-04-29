'use client'

import type { MoMMetric } from '@/services/reports/generate'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function fmtValue(n: number, format: MoMMetric['format']) {
  if (format === 'money') return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (format === 'pct') return `${n.toFixed(2)}%`
  return n.toLocaleString()
}

interface Props {
  comparisons: MoMMetric[]
}

export function ReportMoMComparison({ comparisons }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {comparisons.map((m) => (
        <div
          key={m.label}
          className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900"
        >
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">{m.label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {fmtValue(m.current, m.format)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {m.delta > 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            ) : m.delta < 0 ? (
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span
              className={`text-xs font-medium ${
                m.delta > 0 ? 'text-green-600' : m.delta < 0 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {m.delta > 0 ? '+' : ''}{m.delta}%
            </span>
            <span className="text-xs text-gray-400">vs prev period</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Prev: {fmtValue(m.previous, m.format)}
          </p>
        </div>
      ))}
    </div>
  )
}
