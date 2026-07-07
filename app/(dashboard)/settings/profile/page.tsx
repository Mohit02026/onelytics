'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, User, Lock, Mail, CheckCircle2 } from 'lucide-react'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver', 'Europe/London', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Amsterdam', 'Asia/Dubai', 'Asia/Kolkata',
  'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland',
]

interface Profile {
  name: string | null
  email: string | null
  phone: string | null
  jobTitle: string | null
  avatarUrl: string | null
  timezone: string | null
}

function ProfilePageInner() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  // Mailbox connection (used to send weekly reports from the account holder's own inbox)
  const searchParams = useSearchParams()
  const [mailboxEmail, setMailboxEmail] = useState<string | null>(null)
  const [mailboxLoading, setMailboxLoading] = useState(true)
  const [mailConnecting, setMailConnecting] = useState(false)
  const [mailError, setMailError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile')
      .then((r) => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then((d) => setProfile(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const errorParam = searchParams.get('mailError')
    if (errorParam) {
      setMailError(
        errorParam === 'google_denied'
          ? 'Google sign-in was cancelled.'
          : 'Could not connect your email. Please try again.'
      )
    }
    fetch('/api/workspace/weekly-report')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMailboxEmail(d?.viewerMailboxEmail ?? null))
      .catch(() => {})
      .finally(() => setMailboxLoading(false))
  }, [searchParams])

  async function connectMailbox() {
    setMailConnecting(true)
    setMailError(null)
    try {
      const res = await fetch('/api/integrations/google-mail/connect')
      const d = await res.json()
      if (d.url) window.location.href = d.url
      else setMailError('Could not start connection')
    } catch { setMailError('Something went wrong') }
    finally { setMailConnecting(false) }
  }

  async function disconnectMailbox() {
    setMailConnecting(true)
    setMailError(null)
    try {
      const res = await fetch('/api/integrations/google-mail/disconnect', { method: 'POST' })
      if (res.ok) setMailboxEmail(null)
      else setMailError('Could not disconnect')
    } catch { setMailError('Something went wrong') }
    finally { setMailConnecting(false) }
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          jobTitle: profile.jobTitle,
          avatarUrl: profile.avatarUrl,
          timezone: profile.timezone,
        }),
      })
      const d = await res.json()
      if (!res.ok) setSaveError(d.error ?? 'Failed to save')
      else { setProfile(d); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    } catch { setSaveError('Something went wrong') }
    finally { setSaving(false) }
  }

  async function changePassword() {
    setPwError(null)
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return }
    setPwSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const d = await res.json()
      if (!res.ok) setPwError(d.error ?? 'Failed to change password')
      else {
        setPwSaved(true)
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
        setTimeout(() => setPwSaved(false), 2500)
      }
    } catch { setPwError('Something went wrong') }
    finally { setPwSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-8">
        <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Profile</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your personal account details.</p>
      </div>

      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar preview */}
          {profile?.avatarUrl && (
            <div className="flex items-center gap-3 pb-2">
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <Input
                value={profile?.name ?? ''}
                onChange={(e) => setProfile((p) => p ? { ...p, name: e.target.value } : p)}
                placeholder="Your name"
                className="dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <Input value={profile?.email ?? ''} disabled className="dark:bg-gray-800 dark:border-gray-700 opacity-60" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Job Title</label>
              <Input
                value={profile?.jobTitle ?? ''}
                onChange={(e) => setProfile((p) => p ? { ...p, jobTitle: e.target.value } : p)}
                placeholder="e.g. Marketing Manager"
                className="dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <Input
                value={profile?.phone ?? ''}
                onChange={(e) => setProfile((p) => p ? { ...p, phone: e.target.value } : p)}
                placeholder="+1 555 000 0000"
                className="dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Avatar URL</label>
            <Input
              value={profile?.avatarUrl ?? ''}
              onChange={(e) => setProfile((p) => p ? { ...p, avatarUrl: e.target.value } : p)}
              placeholder="https://example.com/avatar.jpg"
              className="dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          <div className="space-y-1.5 max-w-xs">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
            <Select
              value={profile?.timezone ?? 'America/New_York'}
              onValueChange={(v) => setProfile((p) => p ? { ...p, timezone: v } : p)}
            >
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

          <Button
            onClick={saveProfile}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />Email Sending
          </CardTitle>
          <CardDescription>
            Connect your inbox so automated weekly reports go out from your own email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-w-sm">
          {mailboxLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading…</span>
            </div>
          ) : mailboxEmail ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Sending as <span className="font-medium">{mailboxEmail}</span>
              </div>
              <Button onClick={disconnectMailbox} disabled={mailConnecting} size="sm" variant="outline">
                {mailConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
              </Button>
            </>
          ) : (
            <Button
              onClick={connectMailbox}
              disabled={mailConnecting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {mailConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect Gmail'}
            </Button>
          )}
          {mailError && <p className="text-sm text-red-600 dark:text-red-400">{mailError}</p>}
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4" />Change Password
          </CardTitle>
          <CardDescription>Leave blank to keep your current password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          {pwError && <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>}
          <Button
            onClick={changePassword}
            disabled={pwSaving || !currentPassword || !newPassword}
            size="sm"
            variant="outline"
          >
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : pwSaved ? 'Password changed!' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfilePageInner />
    </Suspense>
  )
}
