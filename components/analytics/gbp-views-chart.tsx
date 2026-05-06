'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { GbpDailyRow } from '@/services/google/gbp'

interface Props {
  data: GbpDailyRow[]
}

export function GbpViewsChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const chartData = data.map((d) => {
    const [, month, day] = d.date.split('-')
    return {
      date: `${month}/${day}`,
      fullDate: d.date,
      mapViews: d.mapViews,
      searchViews: d.searchViews,
    }
  })

  function fmt(v: number) {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
    return v.toString()
  }

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Profile Views</CardTitle>
        <CardDescription>Impressions on Google Search vs Google Maps</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSearch" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
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
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmt} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
              itemStyle={{ color: '#f3f4f6' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="mapViews"
              name="Maps"
              stroke="#4f46e5"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMap)"
              activeDot={{ r: 4, strokeWidth: 0, fill: '#4f46e5' }}
            />
            <Area
              type="monotone"
              dataKey="searchViews"
              name="Search"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSearch)"
              activeDot={{ r: 4, strokeWidth: 0, fill: '#06b6d4' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
