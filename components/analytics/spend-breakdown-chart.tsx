'use client'

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
import type { UnifiedReport } from '@/app/api/analytics/unified/route'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  data: UnifiedReport['dailySpend']
  connected: UnifiedReport['connected']
}

export function SpendBreakdownChart({ data, connected }: Props) {
  const chartData = data.map((row) => ({ ...row, label: formatDate(row.date) }))
  const tickInterval = data.length > 30 ? 6 : data.length > 14 ? 3 : 1
  const showGoogle = connected.google
  const showMeta = connected.meta

  if (!showGoogle && !showMeta) return null

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Daily Ad Spend by Channel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="googleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="metaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={tickInterval} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value, name) => [`$${Number(value).toFixed(2)}`, name === 'google' ? 'Google Ads' : 'Meta Ads']}
            />
            <Legend formatter={(v) => (v === 'google' ? 'Google Ads' : 'Meta Ads')} />
            {showGoogle && <Area type="monotone" dataKey="google" stroke="#3b82f6" strokeWidth={2} fill="url(#googleGrad)" dot={false} name="google" />}
            {showMeta && <Area type="monotone" dataKey="meta" stroke="#ec4899" strokeWidth={2} fill="url(#metaGrad)" dot={false} name="meta" />}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
