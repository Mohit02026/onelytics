'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, Trash2, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface OrgSettings { id: string; name: string; logoUrl: string | null; color: string | null; domain: string | null }
interface Member { role: string; joinedAt: string; user: { id: string; name: string | null; email: string | null; avatarUrl: string | null } }
interface Invite { id: string; email: string; role: string; expiresAt: string }

export default function OrgSettingsPage() {
  const { data: session } = useSession()
  const isOwner = session?.user?.orgRole === 'OWNER'
  const isAdmin = session?.user?.orgRole === 'ADMIN' || isOwner

  const [org, setOrg] = useState<OrgSettings | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [color, setColor] = useState('#2563eb')
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [settingsStatus, setSettingsStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/org/settings').then(r => r.json()),
      fetch('/api/org/members').then(r => r.json()),
    ]).then(([s, m]) => {
      if (!s.error) {
        setOrg(s)
        setName(s.name)
        setLogoUrl(s.logoUrl ?? '')
        setColor(s.color ?? '#2563eb')
        setDomain(s.domain ?? '')
      }
      if (!m.error) {
        setMembers(m.members ?? [])
        setInvites(m.invites ?? [])
      }
    }).finally(() => setLoading(false))
  }, [])

  async function saveSettings() {
    setSaving(true)
    setSettingsStatus(null)
    try {
      const res = await fetch('/api/org/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl, color, domain }),
      })
      const d = await res.json()
      if (res.ok) {
        setOrg(d)
        setSettingsStatus({ ok: true, msg: 'Saved' })
      } else {
        setSettingsStatus({ ok: false, msg: d.error ?? 'Failed' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function sendInvite() {
    if (!inviteEmail) return
    setInviting(true)
    setInviteStatus(null)
    try {
      const res = await fetch('/api/org/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const d = await res.json()
      if (res.ok) {
        setInviteEmail('')
        setInviteStatus({ ok: true, msg: `Invite sent to ${d.email}` })
        setInvites(prev => [...prev, { id: d.id, email: d.email, role: d.role, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }])
      } else {
        setInviteStatus({ ok: false, msg: d.error ?? 'Failed to send invite' })
      }
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(userId: string) {
    await fetch('/api/org/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: userId }),
    })
    setMembers(prev => prev.filter(m => m.user.id !== userId))
  }

  async function revokeInvite(inviteId: string) {
    await fetch('/api/org/members', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId }),
    })
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-sm text-gray-500">Agency settings not available.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Agency settings</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your organisation&apos;s details and team access.</p>
        </div>

        {/* Branding */}
        {isAdmin && (
          <Section title="Organisation" description="Basic info shown across the platform.">
            <Field label="Name">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
                placeholder="Acme Agency"
              />
            </Field>
            <Field label="Logo URL">
              <input
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                className="input"
                placeholder="https://..."
              />
            </Field>
            <Field label="Brand color">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer bg-transparent p-0.5"
                />
                <input
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="input w-32 font-mono"
                  placeholder="#2563eb"
                />
              </div>
            </Field>
            <Field label="Domain (optional)">
              <input
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className="input"
                placeholder="acmeagency.com"
              />
            </Field>

            {settingsStatus && (
              <StatusBanner ok={settingsStatus.ok} msg={settingsStatus.msg} />
            )}

            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save changes
              </button>
            </div>
          </Section>
        )}

        {/* Team */}
        <Section title="Team" description="Members with access to all workspaces in this organisation.">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {members.map(m => (
              <div key={m.user.id} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                  {(m.user.name ?? m.user.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.user.name ?? m.user.email}</p>
                  {m.user.name && <p className="text-xs text-gray-500 truncate">{m.user.email}</p>}
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  m.role === 'OWNER' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                  m.role === 'ADMIN' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>{m.role}</span>
                {isOwner && m.role !== 'OWNER' && (
                  <button
                    onClick={() => removeMember(m.user.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {invites.map(i => (
              <div key={i.id} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-semibold text-gray-400 shrink-0">
                  ?
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{i.email}</p>
                  <p className="text-xs text-gray-400">Invite pending</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">{i.role}</span>
                {isAdmin && (
                  <button
                    onClick={() => revokeInvite(i.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {members.length === 0 && invites.length === 0 && (
              <p className="text-sm text-gray-400 py-3">No members yet.</p>
            )}
          </div>

          {/* Invite form */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Invite team member</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteStatus(null) }}
                  onKeyDown={e => e.key === 'Enter' && sendInvite()}
                  placeholder="colleague@example.com"
                  className="input flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                  className="input w-28"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  onClick={sendInvite}
                  disabled={inviting || !inviteEmail}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Invite
                </button>
              </div>
              {inviteStatus && (
                <div className="mt-2">
                  <StatusBanner ok={inviteStatus.ok} msg={inviteStatus.msg} />
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      <style jsx>{`
        .input {
          background: rgb(249 250 251);
          border: 1px solid rgb(229 231 235);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          width: 100%;
          transition: box-shadow 0.15s;
        }
        .input:focus { box-shadow: 0 0 0 2px rgb(59 130 246 / 0.4); }
        :global(.dark) .input {
          background: rgb(31 41 55);
          border-color: rgb(55 65 81);
          color: white;
        }
      `}</style>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function StatusBanner({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${ok ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      {msg}
    </div>
  )
}
