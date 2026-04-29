'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import type { UnifiedReport } from '@/app/api/analytics/unified/route'

interface Props {
  report: UnifiedReport
}

export function AiSummaryWidget({ report }: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAdSpend: report.totalAdSpend,
          googleAdSpend: report.googleAdSpend,
          metaAdSpend: report.metaAdSpend,
          totalImpressions: report.totalImpressions,
          totalClicks: report.totalClicks,
          organicClicks: report.organicClicks,
          sessions: report.sessions,
          avgPosition: report.avgPosition,
          connected: report.connected,
          dateRange: report.dateRange,
        }),
      })
      if (res.status === 503) {
        setError('Add ANTHROPIC_API_KEY to .env to enable AI summaries.')
        return
      }
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSummary(data.summary)
    } catch {
      setError('Failed to generate summary. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // Parse summary into paragraph + bullets
  function renderSummary(text: string) {
    const lines = text.split('\n').filter((l) => l.trim())
    return lines.map((line, i) => {
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
        return (
          <li key={i} className="text-sm text-gray-700 dark:text-gray-300 ml-2">
            {line.replace(/^[•\-*]\s*/, '')}
          </li>
        )
      }
      return (
        <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {line}
        </p>
      )
    })
  }

  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          AI Performance Summary
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          onClick={generate}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : summary ? (
            <><RefreshCw className="w-3.5 h-3.5 mr-1" />Regenerate</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5 mr-1" />Generate</>
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {!summary && !error && !loading && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Click Generate to get an AI-powered summary of your marketing performance.
          </p>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${i === 2 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        )}

        {summary && !loading && (
          <div>
            {renderSummary(summary)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
