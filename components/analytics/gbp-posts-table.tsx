'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GbpPost } from '@/services/google/gbp'

interface Props {
  posts: GbpPost[]
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

const STATE_BADGE: Record<string, string> = {
  LIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  PROCESSING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
}

export function GbpPostsTable({ posts }: Props) {
  if (posts.length === 0) {
    return (
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No posts found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Posts</CardTitle>
          <span className="text-xs text-gray-400">{posts.length} posts</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Summary</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">State</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p, i) => (
                <tr
                  key={p.name || i}
                  className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(p.createTime)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-md">
                    <div className="flex items-center gap-3">
                      {p.mediaUrl && (
                        <img src={p.mediaUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                      )}
                      <span className="line-clamp-2">{p.summary || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATE_BADGE[p.state] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {p.state || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
