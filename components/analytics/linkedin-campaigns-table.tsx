'use client'

import type { LinkedInCampaign } from '@/services/linkedin/ads'

interface Props {
  campaigns: LinkedInCampaign[]
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        isActive
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      {isActive ? 'Active' : 'Paused'}
    </span>
  )
}

export function LinkedInCampaignsTable({ campaigns }: Props) {
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
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Likes</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Comments</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Shares</th>
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
              <td className="py-3 px-4 text-right text-gray-500 dark:text-gray-400">{(c.likes ?? 0).toLocaleString()}</td>
              <td className="py-3 px-4 text-right text-gray-500 dark:text-gray-400">{(c.comments ?? 0).toLocaleString()}</td>
              <td className="py-3 px-4 text-right text-gray-500 dark:text-gray-400">{(c.shares ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
