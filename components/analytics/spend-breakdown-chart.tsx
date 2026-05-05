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
  tiktokAdSpend?: number
  linkedinAdSpend?: number
}

const CHANNEL_META = {
  google:   { label: 'Google Ads',   color: '#3b82f6' },
  meta:     { label: 'Meta Ads',     color: '#ec4899' },
  tiktok:   { label: 'TikTok Ads',   color: '#14b8a6' },
  linkedin: { label: 'LinkedIn Ads', color: '#0a66c2' },
} as const

export function SpendBreakdownChart({ data, connected, tiktokAdSpend = 0, linkedinAdSpend = 0 }: Props) {
  const chartData = data.map((row) => ({ ...row, label: formatDate(row.date) }))
  const tickInterval = data.length > 30 ? 6 : data.length > 14 ? 3 : 1

  const showGoogle = connected.google
  const showMeta = connected.meta
  const showTiktok = tiktokAdSpend > 0
  const showLinkedin = linkedinAdSpend > 0

  if (!showGoogle && !showMeta && !showTiktok && !showLinkedin) return null

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
              {(Object.keys(CHANNEL_META) as Array<keyof typeof CHANNEL_META>).map((key) => (
                <linearGradient key={key} id={`${key}Grad`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHANNEL_META[key].color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHANNEL_META[key].color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={tickInterval} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value, name) => [`$${Number(value).toFixed(2)}`, CHANNEL_META[name as keyof typeof CHANNEL_META]?.label ?? name]}
            />
            <Legend formatter={(v) => CHANNEL_META[v as keyof typeof CHANNEL_META]?.label ?? v} />
            {showGoogle && <Area type="monotone" dataKey="google" stroke={CHANNEL_META.google.color} strokeWidth={2} fill="url(#googleGrad)" dot={false} name="google" />}
            {showMeta && <Area type="monotone" dataKey="meta" stroke={CHANNEL_META.meta.color} strokeWidth={2} fill="url(#metaGrad)" dot={false} name="meta" />}
            {showTiktok && <Area type="monotone" dataKey="tiktok" stroke={CHANNEL_META.tiktok.color} strokeWidth={2} fill="url(#tiktokGrad)" dot={false} name="tiktok" />}
            {showLinkedin && <Area type="monotone" dataKey="linkedin" stroke={CHANNEL_META.linkedin.color} strokeWidth={2} fill="url(#linkedinGrad)" dot={false} name="linkedin" />}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
