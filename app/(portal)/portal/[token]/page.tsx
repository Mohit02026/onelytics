'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FileText, Download, Loader2, Lock, Calendar, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Report {
  id: string
  title: string
  startDate: string
  endDate: string
  createdAt: string
}

type PortalState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'password-required'; name: string; logoUrl: string | null; color: string }
  | { status: 'ready'; name: string; logoUrl: string | null; color: string; reports: Report[] }

export default function PortalPage() {
  const params = useParams()
  const token = params.token as string
  const [portal, setPortal] = useState<PortalState>({ status: 'loading' })
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authing, setAuthing] = useState(false)

  async function fetchPortal() {
    setPortal({ status: 'loading' })
    try {
      const res = await fetch(`/api/portal/${token}`)
      if (res.status === 404) { setPortal({ status: 'not-found' }); return }
      const d = await res.json()
      if (d.passwordRequired) {
        setPortal({ status: 'password-required', name: d.name, logoUrl: d.logoUrl, color: d.color })
      } else {
        setPortal({ status: 'ready', name: d.name, logoUrl: d.logoUrl, color: d.color, reports: d.reports })
      }
    } catch {
      setPortal({ status: 'not-found' })
    }
  }

  useEffect(() => { fetchPortal() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitPassword() {
    setAuthing(true)
    setAuthError(null)
    try {
      const res = await fetch(`/api/portal/${token}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const d = await res.json()
      if (!res.ok) { setAuthError(d.error ?? 'Incorrect password'); return }
      await fetchPortal()
    } finally {
      setAuthing(false)
    }
  }

  if (portal.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (portal.status === 'not-found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-gray-400" />
        </div>
        <p className="font-semibold text-gray-900 dark:text-white">Portal not available</p>
        <p className="text-sm text-gray-500">This link is invalid or the portal has been disabled.</p>
      </div>
    )
  }

  const { name, logoUrl, color } = portal

  function WorkspaceLogo() {
    return (
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden"
        style={{ backgroundColor: color }}
      >
        {logoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={logoUrl} alt={name} className="w-full h-full object-contain" />
          : name[0]?.toUpperCase()
        }
      </div>
    )
  }

  if (portal.status === 'password-required') {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <WorkspaceLogo />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{name}</p>
              <p className="text-sm text-gray-500">Client Portal</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Password protected</span>
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter portal password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitPassword()}
                className="dark:bg-gray-800 dark:border-gray-700"
                autoFocus
              />
              {authError && <p className="text-sm text-red-500">{authError}</p>}
            </div>
            <Button
              onClick={submitPassword}
              disabled={!password || authing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {authing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Access Portal'}
            </Button>
          </div>

          <p className="text-center text-xs text-gray-400">Powered by Onelytics</p>
        </div>
      </div>
    )
  }

  const { reports } = portal

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <WorkspaceLogo />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{name}</h1>
          <p className="text-sm text-gray-500">Client Reports Portal</p>
        </div>
      </div>

      {/* Reports */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reports</h2>

        {reports.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center space-y-2">
            <FileText className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto" />
            <p className="text-sm text-gray-500">No reports have been generated yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{report.title}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{report.startDate} → {report.endDate}</span>
                    </div>
                  </div>
                </div>
                <a href={`/api/portal/${token}/reports/${report.id}/download`} download>
                  <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400">Powered by Onelytics</p>
    </div>
  )
}
