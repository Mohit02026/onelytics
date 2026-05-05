import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import type { WpPost } from '@/services/wordpress'

interface Props {
  posts: WpPost[]
}

function statusBadge(status: WpPost['status']) {
  if (status === 'publish')
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-0 text-[10px]">
        Published
      </Badge>
    )
  if (status === 'draft')
    return (
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-0 text-[10px]">
        Draft
      </Badge>
    )
  if (status === 'future')
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border-0 text-[10px]">
        Scheduled
      </Badge>
    )
  return (
    <Badge variant="outline" className="text-gray-500 text-[10px]">
      Private
    </Badge>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function WpPostsTable({ posts }: Props) {
  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Recent Posts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Title', 'Status', 'Date', 'Comments'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{post.title}</span>
                      {post.status === 'publish' && (
                        <a
                          href={post.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-gray-400 hover:text-blue-500"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{statusBadge(post.status)}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(post.date)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {post.commentCount}
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
