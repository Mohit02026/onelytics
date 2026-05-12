'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Globe, Copy, Check, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface WorkspaceInfo {
  portalEnabled: boolean
  portalToken: string | null
  role: string
}

export default function ClientPortalPage() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/workspace')
      .then((r) => r.json())
      .then((d) => {
        if (d.id) setWorkspace({ portalEnabled: d.portalEnabled, portalToken: d.portalToken, role: d.role })
      })
      .finally(() => setLoading(false))
  }, [])

  async function togglePortal(enable: boolean) {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalEnabled: enable }),
      })
      const d = await res.json()
      if (!res.ok) {
        setSaveError(d.error ?? 'Failed to update portal')
      } else {
        setWorkspace((prev) => prev ? { ...prev, portalEnabled: d.portalEnabled, portalToken: d.portalToken } : prev)
      }
    } catch {
      setSaveError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function savePassword() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalPassword: password.trim() || null }),
      })
      const d = await res.json()
      if (!res.ok) {
        setSaveError(d.error ?? 'Failed to save password')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setSaveError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function copyPortalUrl() {
    if (!workspace?.portalToken) return
    const url = `${window.location.origin}/portal/${workspace.portalToken}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canEdit = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN'
  const portalUrl = workspace?.portalToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal/${workspace.portalToken}` : null

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Enable / Disable */}
      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Client Portal
          </CardTitle>
          <CardDescription>
            Give your client a read-only link to view their reports without logging in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Portal is <span className={workspace?.portalEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                  {workspace?.portalEnabled ? 'enabled' : 'disabled'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {workspace?.portalEnabled
                  ? 'Clients can access the portal via the link below.'
                  : 'Enable to generate a shareable read-only link.'}
              </p>
            </div>
            {canEdit && (
              <Button
                onClick={() => togglePortal(!workspace?.portalEnabled)}
                disabled={saving}
                variant={workspace?.portalEnabled ? 'outline' : 'default'}
                className={workspace?.portalEnabled
                  ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
                size="sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : workspace?.portalEnabled ? 'Disable' : 'Enable Portal'}
              </Button>
            )}
          </div>

          {/* Portal URL */}
          {workspace?.portalEnabled && portalUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Portal Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono text-xs text-gray-700 dark:text-gray-300 overflow-hidden">
                  <span className="truncate">{portalUrl}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPortalUrl}
                  className="shrink-0 gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
              <p className="text-xs text-gray-400">
                Share this link with your client. They can view reports without creating an account.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Protection */}
      {workspace?.portalEnabled && (
        <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base">Password Protection</CardTitle>
            <CardDescription>
              Optionally require a password to access the portal. Leave blank to allow open access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5 max-w-sm">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Portal Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Leave blank for open access"
                  className="pr-10 dark:bg-gray-800 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={savePassword}
                  disabled={saving}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? 'Saved!' : 'Save Password'}
                </Button>
                {password && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setPassword(''); savePassword() }}
                    className="text-gray-400 hover:text-red-500 text-xs"
                  >
                    Clear password
                  </Button>
                )}
              </div>
            )}
            {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">What clients can see</p>
        <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>All generated reports for this workspace</li>
          <li>Report details, charts, and PDF download</li>
          <li>Read-only — cannot generate reports or change settings</li>
        </ul>
      </div>
    </div>
  )
}
