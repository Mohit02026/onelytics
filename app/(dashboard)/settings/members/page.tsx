'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, UserPlus, Copy, Check, Trash2, Crown, Shield, Eye, User } from 'lucide-react'

interface Member {
  id: string
  role: string
  joinedAt: string
  user: { id: string; name: string | null; email: string; image: string | null }
}

interface PendingInvite {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

interface MembersData {
  members: Member[]
  invites: PendingInvite[]
  currentUserRole: string
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  OWNER: <Crown className="w-3 h-3" />,
  ADMIN: <Shield className="w-3 h-3" />,
  MEMBER: <User className="w-3 h-3" />,
  VIEWER: <Eye className="w-3 h-3" />,
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ADMIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  MEMBER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  VIEWER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role] ?? ROLE_COLORS.VIEWER}`}
    >
      {ROLE_ICONS[role]}
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

export default function MembersPage() {
  const [data, setData] = useState<MembersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null)

  // Remove
  const [removing, setRemoving] = useState<string | null>(null)

  async function loadMembers() {
    try {
      const res = await fetch('/api/workspace/members')
      const d = await res.json()
      if (!res.ok) setError(d.error ?? 'Failed to load members')
      else setData(d)
    } catch {
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  async function sendInvite() {
    setInviting(true)
    setInviteError(null)
    setInviteUrl(null)
    try {
      const res = await fetch('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const d = await res.json()
      if (!res.ok) {
        setInviteError(d.error ?? 'Failed to send invite')
      } else {
        setInviteUrl(d.inviteUrl)
        setInviteEmail('')
        loadMembers()
      }
    } catch {
      setInviteError('Something went wrong')
    } finally {
      setInviting(false)
    }
  }

  async function changeRole(memberId: string, role: string) {
    setChangingRole(memberId)
    try {
      await fetch(`/api/workspace/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      loadMembers()
    } finally {
      setChangingRole(null)
    }
  }

  async function removeMember(memberId: string) {
    setRemoving(memberId)
    try {
      await fetch(`/api/workspace/members/${memberId}`, { method: 'DELETE' })
      loadMembers()
    } finally {
      setRemoving(null)
    }
  }

  async function copyInviteUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canManage = data?.currentUserRole === 'OWNER' || data?.currentUserRole === 'ADMIN'
  const isOwner = data?.currentUserRole === 'OWNER'

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Members</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage who has access to this workspace.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading members…</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Invite Form */}
          {canManage && (
            <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </CardTitle>
                <CardDescription>Send an invite link to add someone to this workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 dark:bg-gray-800 dark:border-gray-700"
                    onKeyDown={(e) => e.key === 'Enter' && inviteEmail && sendInvite()}
                  />
                  <Select value={inviteRole} onValueChange={(v: string | null) => v && setInviteRole(v)}>
                    <SelectTrigger className="w-32 dark:bg-gray-800 dark:border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={sendInvite}
                    disabled={inviting || !inviteEmail}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
                  </Button>
                </div>

                {inviteError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                )}

                {inviteUrl && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400 flex-1 truncate font-mono">
                      {inviteUrl}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInviteUrl(inviteUrl)}
                      className="shrink-0 h-7 px-2"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Members List */}
          <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-base">
                Members{' '}
                <span className="text-gray-400 font-normal text-sm">({data.members.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {(m.user.name ?? m.user.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {m.user.name ?? m.user.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{m.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner && m.role !== 'OWNER' ? (
                        <Select
                          value={m.role}
                          onValueChange={(r: string | null) => r && changeRole(m.id, r)}
                          disabled={changingRole === m.id}
                        >
                          <SelectTrigger className="h-7 text-xs w-28 dark:bg-gray-800 dark:border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OWNER">Owner</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <RoleBadge role={m.role} />
                      )}

                      {canManage && m.role !== 'OWNER' && (
                        <AlertDialog>
                          <AlertDialogTrigger>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                              disabled={removing === m.id}
                            >
                              {removing === m.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {m.user.name ?? m.user.email} will lose access to this workspace. This
                                action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeMember(m.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Invites */}
          {data.invites.length > 0 && (
            <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="text-base">
                  Pending Invites{' '}
                  <span className="text-gray-400 font-normal text-sm">({data.invites.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.invites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <span className="text-sm text-gray-400">?</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {inv.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <RoleBadge role={inv.role} />
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
