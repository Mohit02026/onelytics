import { Card, CardContent } from '@/components/ui/card'
import { FileText, CheckCircle, PenLine, Clock, LayoutTemplate, MessageSquare } from 'lucide-react'
import type { WpOverview } from '@/services/wordpress'

interface Props {
  data: WpOverview
}

export function WpOverviewCards({ data }: Props) {
  const cards = [
    {
      label: 'Published Posts',
      value: data.published.toLocaleString(),
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Drafts',
      value: data.drafts.toLocaleString(),
      icon: PenLine,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      label: 'Scheduled',
      value: data.scheduled.toLocaleString(),
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Pages',
      value: data.totalPages.toLocaleString(),
      icon: LayoutTemplate,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950',
    },
    {
      label: 'Total Posts',
      value: data.totalPosts.toLocaleString(),
      icon: FileText,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: 'Comments',
      value: data.totalComments.toLocaleString(),
      icon: MessageSquare,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950',
      sub: data.pendingComments > 0 ? `${data.pendingComments} pending` : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {card.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                {card.sub && (
                  <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">{card.sub}</p>
                )}
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
