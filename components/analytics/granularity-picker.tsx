'use client'

import { cn } from '@/lib/utils'
import type { Granularity } from '@/lib/aggregate'

interface Props {
  value: Granularity
  onChange: (g: Granularity) => void
}

const OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function GranularityPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-2.5 py-1.5 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-blue-600 text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
