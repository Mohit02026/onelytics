'use client'

import type { TikTokCampaign } from '@/services/tiktok/ads'

interface Props {
  campaigns: TikTokCampaign[]
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ENABLE' || status === 'ACTIVE'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        isActive
          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      {isActive ? 'Active' : 'Paused'}
    </span>
  )
}

export function TikTokCampaignsTable({ campaigns }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Campaign</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Spend</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Impressions</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Clicks</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">CTR</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Conversions</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">CPA</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <td className="py-3 px-4 font-medium text-gray-900 dark:text-white max-w-[220px] truncate">{c.name}</td>
              <td className="py-3 px-4 text-right"><StatusBadge status={c.status} /></td>
              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">${c.spend.toFixed(2)}</td>
              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{c.impressions.toLocaleString()}</td>
              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{c.clicks.toLocaleString()}</td>
              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{c.ctr.toFixed(2)}%</td>
              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">{c.conversions.toLocaleString()}</td>
              <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                {c.cpa > 0 ? `$${c.cpa.toFixed(2)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
