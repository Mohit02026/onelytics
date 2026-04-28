'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Ga4TrafficSource } from '@/services/google/ga4'

const COLORS = ['#3b82f6', '#a855f7', '#f97316', '#22c55e']

interface Props {
  data: Ga4TrafficSource[]
}

export function TrafficSourcesChart({ data }: Props) {
  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Traffic Sources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="source"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={110}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => [Number(value).toLocaleString(), 'Sessions']}
            />
            <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {data.map((item, i) => (
            <div key={item.source} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-gray-600 dark:text-gray-400">{item.source}</span>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
