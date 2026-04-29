'use client'

import type { ChannelMetrics } from '@/services/reports/generate'

interface Props {
  channels: ChannelMetrics[]
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: color }} />
}

export function ReportChannelTable({ channels }: Props) {
  if (channels.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">
        No channel data available for this period.
      </p>
    )
  }

  const totalSpend = channels.reduce((s, c) => s + c.spend, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {['Channel', 'Spend', 'Share', 'Impressions', 'Clicks', 'CTR', 'CPM', 'Conversions', 'CPA'].map((h) => (
              <th key={h} className={`py-3 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${h === 'Channel' ? 'text-left' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {channels.map((c) => (
            <tr key={c.channel} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">
                <ColorDot color={c.color} />
                {c.channel}
              </td>
              <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300 font-medium">{fmtMoney(c.spend)}</td>
              <td className="py-3 px-3 text-right text-gray-500">
                {totalSpend > 0 ? `${Math.round((c.spend / totalSpend) * 100)}%` : '—'}
              </td>
              <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">{c.impressions.toLocaleString()}</td>
              <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">{c.clicks.toLocaleString()}</td>
              <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">{c.ctr.toFixed(2)}%</td>
              <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">{fmtMoney(c.cpm)}</td>
              <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">{c.conversions.toLocaleString()}</td>
              <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">
                {c.cpa > 0 ? fmtMoney(c.cpa) : '—'}
              </td>
            </tr>
          ))}

          {/* Totals row */}
          <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">Total</td>
            <td className="py-3 px-3 text-right font-semibold text-gray-900 dark:text-white">
              {fmtMoney(channels.reduce((s, c) => s + c.spend, 0))}
            </td>
            <td className="py-3 px-3 text-right text-gray-500">100%</td>
            <td className="py-3 px-3 text-right font-semibold text-gray-900 dark:text-white">
              {channels.reduce((s, c) => s + c.impressions, 0).toLocaleString()}
            </td>
            <td className="py-3 px-3 text-right font-semibold text-gray-900 dark:text-white">
              {channels.reduce((s, c) => s + c.clicks, 0).toLocaleString()}
            </td>
            <td className="py-3 px-3 text-right text-gray-500">—</td>
            <td className="py-3 px-3 text-right text-gray-500">—</td>
            <td className="py-3 px-3 text-right font-semibold text-gray-900 dark:text-white">
              {channels.reduce((s, c) => s + c.conversions, 0).toLocaleString()}
            </td>
            <td className="py-3 px-3 text-right text-gray-500">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
