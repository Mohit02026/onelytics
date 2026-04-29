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

function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function relativeDays(n: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - n + 1)
  return { startDate: fmt(start), endDate: fmt(end) }
}

function thisMonth() {
  const now = new Date()
  return {
    startDate: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: fmt(now),
  }
}

function lastMonth() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const last = new Date(now.getFullYear(), now.getMonth(), 0)
  return { startDate: fmt(first), endDate: fmt(last) }
}

function thisYear() {
  const now = new Date()
  return {
    startDate: fmt(new Date(now.getFullYear(), 0, 1)),
    endDate: fmt(now),
  }
}

function lastYear() {
  const y = new Date().getFullYear() - 1
  return {
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
  }
}

const PRESETS: DateRange[] = [
  { label: 'Last 7 days', ...relativeDays(7) },
  { label: 'Last 14 days', ...relativeDays(14) },
  { label: 'Last 30 days', ...relativeDays(30) },
  { label: 'Last 90 days', ...relativeDays(90) },
  { label: 'Last 6 months', ...relativeDays(182) },
  { label: 'This month', ...thisMonth() },
  { label: 'Last month', ...lastMonth() },
  { label: 'This year', ...thisYear() },
  { label: 'Last year', ...lastYear() },
]

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [customError, setCustomError] = useState('')

  const isCustom = !PRESETS.some(
    (p) => p.startDate === value.startDate && p.endDate === value.endDate
  )

  const displayLabel = isCustom
    ? `${value.startDate} → ${value.endDate}`
    : value.label

  function applyCustom() {
    setCustomError('')
    if (!customStart || !customEnd) { setCustomError('Both dates required.'); return }
    if (customStart > customEnd) { setCustomError('Start must be before end.'); return }
    onChange({ label: 'Custom', startDate: customStart, endDate: customEnd })
    setOpen(false)
    setCustomStart('')
    setCustomEnd('')
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 text-sm font-medium h-9 max-w-[240px]"
        onClick={() => setOpen((o) => !o)}
      >
        <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
        <span className="truncate">{displayLabel}</span>
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 min-w-[200px]">
            {PRESETS.map((preset) => {
              const active = value.startDate === preset.startDate && value.endDate === preset.endDate
              return (
                <button
                  key={preset.label}
                  onClick={() => { onChange(preset); setOpen(false) }}
                  className={cn(
                    'w-full text-left text-sm px-3 py-2 rounded-md transition-colors',
                    active
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {preset.label}
                </button>
              )
            })}

            <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-2 px-2 pb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">Custom range</p>
              <div className="space-y-1.5">
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || fmt(new Date())}
                  onChange={(e) => { setCustomStart(e.target.value); setCustomError('') }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={fmt(new Date())}
                  onChange={(e) => { setCustomEnd(e.target.value); setCustomError('') }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {customError && <p className="text-xs text-red-500 px-1">{customError}</p>}
                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={applyCustom}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function defaultDateRange(): DateRange {
  return { label: 'Last 30 days', ...relativeDays(30) }
}
