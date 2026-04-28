'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string
  label: string
}

const PRESETS: DateRange[] = [
  {
    label: 'Last 7 days',
    ...relativeDays(7),
  },
  {
    label: 'Last 30 days',
    ...relativeDays(30),
  },
  {
    label: 'Last 90 days',
    ...relativeDays(90),
  },
]

function relativeDays(n: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - n + 1)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 text-sm font-medium h-9"
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarDays className="w-4 h-4 text-gray-500" />
        {value.label}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 min-w-[160px]">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onChange(preset)
                  setOpen(false)
                }}
                className={cn(
                  'w-full text-left text-sm px-3 py-2 rounded-md transition-colors',
                  value.label === preset.label
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function defaultDateRange(): DateRange {
  return { label: 'Last 30 days', ...relativeDays(30) }
}
