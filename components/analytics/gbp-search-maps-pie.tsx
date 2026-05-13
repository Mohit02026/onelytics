'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { GbpOverview } from '@/services/google/gbp'

interface Props {
  data: GbpOverview
}

const COLORS = ['#4f46e5', '#10b981']

export function GbpSearchMapsPie({ data }: Props) {
  const chartData = [
    { name: 'Search', value: data.searchViews },
    { name: 'Maps', value: data.mapViews },
  ].filter((d) => d.value > 0)

  const total = data.searchViews + data.mapViews

  if (total === 0) return null

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Search vs Maps Views</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [(value as number).toLocaleString(), '']}
                contentStyle={{ backgroundColor: 'var(--tw-bg-gray-900, #111827)', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              />
              <Legend
                formatter={(value) => {
                  const item = chartData.find((d) => d.name === value)
                  const pct = item ? ((item.value / total) * 100).toFixed(1) : '0'
                  return <span className="text-xs text-gray-600 dark:text-gray-400">{value} {item?.value.toLocaleString()} ({pct}%)</span>
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
