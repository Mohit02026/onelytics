'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'
import type { GbpReview } from '@/services/google/gbp'

interface Props {
  reviews: GbpReview[]
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </span>
  )
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return '—'
  }
}

export function GbpReviewsTable({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No reviews found for this period.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Reviews</CardTitle>
          <span className="text-xs text-gray-400">{reviews.length} reviews</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reviewer</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Review</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rating</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Replied</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r, i) => (
                <tr
                  key={r.reviewId || i}
                  className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                >
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(r.createTime)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.reviewer || 'Anonymous'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs truncate">{r.comment || '—'}</td>
                  <td className="px-4 py-3"><StarRating rating={r.rating} /></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.replied ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {r.replied ? 'Yes' : 'No'}
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
