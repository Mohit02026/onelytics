'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, FileText, CheckSquare, Square } from 'lucide-react'

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

const PLATFORMS = [
  { id: 'googleAds', label: 'Google Ads', icon: '🔵' },
  { id: 'meta', label: 'Meta Ads', icon: '🟣' },
  { id: 'tiktok', label: 'TikTok Ads', icon: '⚫' },
  { id: 'linkedin', label: 'LinkedIn Ads', icon: '🔷' },
  { id: 'ga4', label: 'Google Analytics', icon: '🟠' },
  { id: 'gsc', label: 'Search Console', icon: '🟢' },
  { id: 'gbp', label: 'Google Business', icon: '📍' },
  { id: 'wordpress', label: 'WordPress', icon: '🔵' },
]

function getRange(days: number) {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - days + 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { startDate: fmt(start), endDate: fmt(end) }
}

export default function NewReportPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(getRange(30).startDate)
  const [endDate, setEndDate] = useState(getRange(30).endDate)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    PLATFORMS.map((p) => p.id)
  )
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyPreset(days: number) {
    const r = getRange(days)
    setStartDate(r.startDate)
    setEndDate(r.endDate)
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelectedPlatforms((prev) =>
      prev.length === PLATFORMS.length ? [] : PLATFORMS.map((p) => p.id)
    )
  }

  async function generate() {
    if (!title.trim()) { setError('Report title is required.'); return }
    if (selectedPlatforms.length === 0) { setError('Select at least one platform.'); return }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), startDate, endDate, selectedPlatforms }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate report.')
      } else {
        router.push(`/reports/${data.id}`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const allSelected = selectedPlatforms.length === PLATFORMS.length
  const selectedLabels = PLATFORMS
    .filter((p) => selectedPlatforms.includes(p.id))
    .map((p) => p.label)

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">New Report</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Generate an agency-style marketing report across selected channels.
        </p>
      </div>

      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Report Configuration
          </CardTitle>
          <CardDescription>Choose the period, platforms, and title for your report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Report Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. June 2026 Performance Report"
              className="dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.days)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 items-center mt-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>
              <span className="text-gray-400 mt-5">→</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="dark:bg-gray-800 dark:border-gray-700 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Platforms to Include
              </label>
              <button
                onClick={toggleAll}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {allSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => {
                const checked = selectedPlatforms.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                      checked
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-base leading-none">{p.icon}</span>
                    <span className="font-medium">{p.label}</span>
                    <span className="ml-auto">
                      {checked
                        ? <CheckSquare className="w-4 h-4 text-blue-500" />
                        : <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                      }
                    </span>
                  </button>
                )
              })}
            </div>
            {selectedPlatforms.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Select at least one platform.</p>
            )}
          </div>

          {/* Info banner */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-3">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              {selectedPlatforms.length === 0
                ? 'No platforms selected — report will be empty.'
                : `Report will include: ${selectedLabels.join(', ')}.`
              }
              {' '}An AI narrative will be generated if <code className="font-mono">ANTHROPIC_API_KEY</code> is set.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              onClick={generate}
              disabled={generating || !title.trim() || selectedPlatforms.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating report…
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/reports')}
              disabled={generating}
            >
              Cancel
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
