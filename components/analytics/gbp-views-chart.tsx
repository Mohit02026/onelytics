'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { cn } from '@/lib/utils'
import type { GbpDailyRow } from '@/services/google/gbp'

function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

interface Props {
  data: GbpDailyRow[]
}

const METRICS = [
  { key: 'searchViews', label: 'Search Views', color: '#3b82f6', axis: 'left' as const },
  { key: 'mapViews', label: 'Maps Views', color: '#8b5cf6', axis: 'left' as const },
  { key: 'websiteClicks', label: 'Website Clicks', color: '#10b981', axis: 'right' as const },
  { key: 'directionRequests', label: 'Directions', color: '#f59e0b', axis: 'right' as const },
  { key: 'photoViews', label: 'Photo Views', color: '#ec4899', axis: 'right' as const },
]

export function GbpViewsChart({ data }: Props) {
  const [active, setActive] = useState<Set<string>>(new Set(['searchViews', 'mapViews']))

  if (!data || data.length === 0) return null

  const chartData = data.map((d) => {
    const [, month, day] = d.date.split('-')
    return { ...d, date: `${month}/${day}` }
  })

  const activeMetrics = METRICS.filter((m) => active.has(m.key))
  const hasLeft = activeMetrics.some((m) => m.axis === 'left')
  const hasRight = activeMetrics.some((m) => m.axis === 'right')
  const tickInterval = data.length > 30 ? 6 : data.length > 14 ? 3 : 1

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
            Profile Activity
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
      <CardContent className="min-h-[260px]">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: hasRight ? 48 : 16, left: 0, bottom: 0 }}>
            <defs>
              {METRICS.map((m) => (
                <linearGradient key={m.key} id={`gbpGrad_${m.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={m.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} interval={tickInterval} minTickGap={30} />
            {hasLeft && (
              <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtNum} width={44} />
            )}
            {hasRight && (
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtNum} width={44} />
            )}
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6', fontSize: '12px' }}
              itemStyle={{ color: '#f3f4f6' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              formatter={(value, name) => {
                const m = METRICS.find((x) => x.key === name)
                return [Number(value).toLocaleString(), m?.label ?? name]
              }}
            />
            <Legend
              formatter={(v) => METRICS.find((m) => m.key === v)?.label ?? v}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            {activeMetrics.map((m) => (
              <Area
                key={m.key}
                yAxisId={m.axis}
                type="monotone"
                dataKey={m.key}
                name={m.key}
                stroke={m.color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#gbpGrad_${m.key})`}
                activeDot={{ r: 4, strokeWidth: 0, fill: m.color }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
