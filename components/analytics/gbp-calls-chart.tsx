'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { GbpDailyRow } from '@/services/google/gbp'

interface Props {
  data: GbpDailyRow[]
}

export function GbpCallsChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const chartData = data.map((d) => {
    const [, month, day] = d.date.split('-')
    return {
      date: `${month}/${day}`,
      fullDate: d.date,
      calls: d.calls,
    }
  })

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Calls Overview</CardTitle>
        <CardDescription>Daily phone calls from your business profile</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
              itemStyle={{ color: '#f3f4f6' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="calls"
              name="Calls"
              stroke="#16a34a"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCalls)"
              activeDot={{ r: 4, strokeWidth: 0, fill: '#16a34a' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
