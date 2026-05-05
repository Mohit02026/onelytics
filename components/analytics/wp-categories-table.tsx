import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tag } from 'lucide-react'
import type { WpCategory } from '@/services/wordpress'

interface Props {
  categories: WpCategory[]
}

export function WpCategoriesTable({ categories }: Props) {
  if (!categories || categories.length === 0) return null

  const max = categories[0]?.count ?? 1

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-500" />
          Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 dark:text-gray-300 w-40 truncate">{c.name}</span>
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.round((c.count / max) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">{c.count}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right font-mono">/{c.slug}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
