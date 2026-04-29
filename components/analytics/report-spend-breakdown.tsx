'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ReportData } from '@/services/reports/generate'

interface Props {
  data: ReportData
}

export function ReportSpendBreakdown({ data }: Props) {
  const { dailySpend, channels } = data
  if (dailySpend.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">No spend data available.</p>
  }

  const channelColors: Record<string, string> = {}
  for (const c of channels) {
    const key = c.channel.toLowerCase().replace(' ads', '').replace(' ', '')
    channelColors[key] = c.color
  }

  const googleColor = channelColors.google ?? '#4285f4'
  const metaColor = channelColors.meta ?? '#e91e8c'
  const tiktokColor = channelColors.tiktok ?? '#14b8a6'
  const linkedinColor = channelColors.linkedin ?? '#0a66c2'

  const activeChannels = channels.map((c) =>
    c.channel.toLowerCase().replace(' ads', '').replace(' ', '')
  )

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dailySpend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            {[
              { id: 'google', color: googleColor },
              { id: 'meta', color: metaColor },
              { id: 'tiktok', color: tiktokColor },
              { id: 'linkedin', color: linkedinColor },
            ].map(({ id, color }) => (
              <linearGradient key={id} id={`rpt_${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-100 dark:stroke-gray-800" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => v.slice(5)}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${v}`}
            tick={{ fontSize: 10 }}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [`$${Number(value).toFixed(2)}`, String(name)]}
            labelFormatter={(label) => `Date: ${String(label)}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {activeChannels.includes('google') && (
            <Area type="monotone" dataKey="google" name="Google Ads" stroke={googleColor} strokeWidth={2} fill={`url(#rpt_google)`} />
          )}
          {activeChannels.includes('meta') && (
            <Area type="monotone" dataKey="meta" name="Meta Ads" stroke={metaColor} strokeWidth={2} fill={`url(#rpt_meta)`} />
          )}
          {activeChannels.includes('tiktok') && (
            <Area type="monotone" dataKey="tiktok" name="TikTok Ads" stroke={tiktokColor} strokeWidth={2} fill={`url(#rpt_tiktok)`} />
          )}
          {activeChannels.includes('linkedin') && (
            <Area type="monotone" dataKey="linkedin" name="LinkedIn Ads" stroke={linkedinColor} strokeWidth={2} fill={`url(#rpt_linkedin)`} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
