'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { signOut } from 'next-auth/react'
import { Loader2, Trash2, Save } from 'lucide-react'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Amsterdam', 'Asia/Kolkata', 'Asia/Dubai',
  'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
]

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
]

interface WorkspaceInfo {
  id: string
  name: string
  createdAt: string
  clientLogoUrl: string | null
  clientColor: string | null
  clientContactName: string | null
  clientContactEmail: string | null
  timezone: string | null
  currency: string | null
  role: string
  _count: { members: number }
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  // Form state
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [color, setColor] = useState('#2563eb')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [currency, setCurrency] = useState('USD')

  useEffect(() => {
    fetch('/api/workspace')
      .then((r) => r.json())
      .then((d) => {
        if (d.id) {
          setWorkspace(d)
          setName(d.name ?? '')
          setLogoUrl(d.clientLogoUrl ?? '')
          setColor(d.clientColor ?? '#2563eb')
          setContactName(d.clientContactName ?? '')
          setContactEmail(d.clientContactEmail ?? '')
          setTimezone(d.timezone ?? 'America/New_York')
          setCurrency(d.currency ?? 'USD')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          clientLogoUrl: logoUrl.trim() || undefined,
          clientColor: color,
          clientContactName: contactName.trim() || undefined,
          clientContactEmail: contactEmail.trim() || undefined,
          timezone,
          currency,
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        setSaveError(d.error ?? 'Failed to save')
      } else {
        setWorkspace((prev) => prev ? { ...prev, ...d } : prev)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setSaveError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const canEdit = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN'

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

      {/* Workspace Identity */}
      <Section title="Workspace" description="Basic identity for this client workspace.">
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Workspace Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. Ability School NJ"
              className="dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 pt-1">
            <span>ID: <span className="font-mono text-xs text-gray-400">{workspace?.id?.slice(0, 8)}…</span></span>
            <span>Created: <span className="text-gray-700 dark:text-gray-300">{workspace ? new Date(workspace.createdAt).toLocaleDateString() : '—'}</span></span>
            <span>Your role: <span className="text-gray-700 dark:text-gray-300">{workspace?.role}</span></span>
          </div>
        </div>
      </Section>

      {/* Branding */}
      <Section title="Branding" description="Used on PDF reports and client-facing pages.">
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo URL</label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              disabled={!canEdit}
              placeholder="https://yoursite.com/logo.png"
              className="dark:bg-gray-800 dark:border-gray-700"
            />
            <p className="text-xs text-gray-400">Paste a direct image URL. Appears on PDF report cover pages.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={!canEdit}
                className="h-9 w-16 rounded border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 bg-white dark:bg-gray-800"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={!canEdit}
                placeholder="#2563eb"
                className="w-32 font-mono dark:bg-gray-800 dark:border-gray-700"
                maxLength={7}
              />
              <div
                className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: color }}
              />
            </div>
            <p className="text-xs text-gray-400">Used as accent color in PDF headers and charts.</p>
          </div>
        </div>
      </Section>

      {/* Contact Info */}
      <Section title="Contact Info" description="Shown on report cover pages.">
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Name</label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. John Smith"
              className="dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Email</label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={!canEdit}
              placeholder="john@youragency.com"
              className="dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>
      </Section>

      {/* Regional */}
      <Section title="Regional" description="Affects date formatting and currency display across dashboards and reports.">
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={!canEdit}
              className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={!canEdit}
              className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Save button */}
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </Button>
          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
        </div>
      )}

      {/* Danger Zone — OWNER only */}
      {workspace?.role === 'OWNER' && (
        <Card className="dark:bg-gray-900 border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
              <Trash2 className="w-4 h-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>Permanent, irreversible actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">
                  Delete Workspace
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{workspace?.name}</strong> and all its data. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true)
                      await fetch('/api/workspace', { method: 'DELETE' }).catch(() => null)
                      await signOut({ redirect: false })
                      router.push('/login')
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Workspace'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
