'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TikTokDailyRow } from '@/services/tiktok/ads'

interface Props {
  data: TikTokDailyRow[]
}

export function TikTokSpendChart({ data }: Props) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ttSpendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => v.slice(5)}
            tick={{ fontSize: 11 }}
            className="fill-gray-400"
          />
          <YAxis
            tickFormatter={(v: number) => `$${v}`}
            tick={{ fontSize: 11 }}
            className="fill-gray-400"
            width={50}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spend']}
            labelFormatter={(label) => `Date: ${String(label)}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="spend"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#ttSpendGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
