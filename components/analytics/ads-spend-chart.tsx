'use client'

import { useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AdsDailyRow } from '@/services/google/ads'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtRight(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

interface Props {
  data: AdsDailyRow[]
}

const METRICS = [
  { key: 'spend', label: 'Spend', color: '#3b82f6', axis: 'left' as const, format: (v: number) => `$${v.toFixed(2)}` },
  { key: 'clicks', label: 'Clicks', color: '#10b981', axis: 'right' as const, format: (v: number) => Number(v).toLocaleString() },
  { key: 'impressions', label: 'Impressions', color: '#8b5cf6', axis: 'right' as const, format: (v: number) => Number(v).toLocaleString() },
  { key: 'phoneCalls', label: 'Phone Calls', color: '#f59e0b', axis: 'right' as const, format: (v: number) => Number(v).toLocaleString() },
]

export function AdsSpendChart({ data }: Props) {
  const [active, setActive] = useState<Set<string>>(new Set(['spend', 'clicks']))

  const chartData = data.map((row) => ({ ...row, label: formatDate(row.date) }))
  const activeMetrics = METRICS.filter((m) => active.has(m.key))
  const hasLeft = activeMetrics.some((m) => m.axis === 'left')
  const hasRight = activeMetrics.some((m) => m.axis === 'right')

  function toggle(key: string) {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) }
      else next.add(key)
      return next
    })
  }

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Daily Performance
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
                  active.has(m.key)
                    ? 'text-white border-transparent'
                    : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                )}
                style={active.has(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: hasRight ? 48 : 16, left: 0, bottom: 0 }}>
            <defs>
              {METRICS.map((m) => (
                <linearGradient key={m.key} id={`adsGrad_${m.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={m.color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={55} />
            {hasLeft && (
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${v}`} />
            )}
            {hasRight && (
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={44} tickFormatter={fmtRight} />
            )}
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value, name) => {
                const m = METRICS.find((x) => x.key === name)
                return [m ? m.format(Number(value)) : value, m?.label ?? name]
              }}
            />
            <Legend formatter={(v) => METRICS.find((m) => m.key === v)?.label ?? v} />
            {activeMetrics.map((m) => (
              <Area
                key={m.key}
                yAxisId={m.axis}
                type="monotone"
                dataKey={m.key}
                stroke={m.color}
                strokeWidth={2}
                fill={`url(#adsGrad_${m.key})`}
                dot={false}
                name={m.key}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
