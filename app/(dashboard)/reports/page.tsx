'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Plus, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface ReportSummary {
  id: string
  title: string
  startDate: string
  endDate: string
  status: 'GENERATING' | 'READY' | 'FAILED'
  createdAt: string
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadReports() {
    try {
      const res = await fetch('/api/reports')
      if (res.ok) setReports(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReports() }, [])

  async function deleteReport(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      setReports((prev) => prev.filter((r) => r.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const statusIcon = {
    READY: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    GENERATING: <Clock className="w-4 h-4 text-amber-500 animate-pulse" />,
    FAILED: <XCircle className="w-4 h-4 text-red-500" />,
  }

  const statusLabel = {
    READY: 'Ready',
    GENERATING: 'Generating…',
    FAILED: 'Failed',
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate and view agency-style marketing performance reports.
          </p>
        </div>
        <Link href="/reports/new">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Report
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading reports…</span>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No reports yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Generate your first marketing performance report.
            </p>
            <Link href="/reports/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Generate Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <Link href={r.status === 'READY' ? `/reports/${r.id}` : '#'} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{r.title}</p>
                  <p className="text-xs text-gray-500">
                    {r.startDate} → {r.endDate} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {statusIcon[r.status]}
                  <span className="text-xs text-gray-500">{statusLabel[r.status]}</span>
                </div>
              </Link>
              <button
                onClick={() => deleteReport(r.id)}
                disabled={deletingId === r.id}
                className="ml-4 p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                {deletingId === r.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
