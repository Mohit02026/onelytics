'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GscDailyRow } from '@/services/google/gsc'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  data: GscDailyRow[]
}

export function GscClicksChart({ data }: Props) {
  const chartData = data.map((row) => ({ ...row, label: formatDate(row.date) }))
  const tickInterval = data.length > 30 ? 6 : data.length > 14 ? 3 : 1

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Clicks & Impressions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={tickInterval} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value, name) => [
                Number(value).toLocaleString(),
                name === 'clicks' ? 'Clicks' : 'Impressions',
              ]}
            />
            <Legend formatter={(v) => (v === 'clicks' ? 'Clicks' : 'Impressions')} />
            <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="clicks" />
            <Line type="monotone" dataKey="impressions" stroke="#a78bfa" strokeWidth={2} dot={false} name="impressions" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
