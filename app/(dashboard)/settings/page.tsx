'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { signOut } from 'next-auth/react'
import { Loader2, Users, ChevronRight, Plug, Trash2 } from 'lucide-react'

interface WorkspaceInfo {
  id: string
  name: string
  createdAt: string
  _count: { members: number }
  role: string
}

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/workspace')
      .then((r) => r.json())
      .then((d) => {
        if (d.id) {
          setWorkspace(d)
          setNameInput(d.name ?? '')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveName() {
    if (!nameInput.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error ?? 'Failed to save')
      } else {
        setWorkspace((prev) => (prev ? { ...prev, name: d.name } : prev))
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const canEdit = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN'

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your workspace and preferences.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <>
          {/* Workspace Profile */}
          <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle>Workspace Profile</CardTitle>
              <CardDescription>Update your workspace name.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Workspace Name
                </label>
                <div className="flex gap-3 max-w-md">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    disabled={!canEdit}
                    className="dark:bg-gray-800 dark:border-gray-700"
                    onKeyDown={(e) => e.key === 'Enter' && canEdit && saveName()}
                  />
                  {canEdit && (
                    <Button
                      onClick={saveName}
                      disabled={saving || !nameInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? 'Saved!' : 'Save'}
                    </Button>
                  )}
                </div>
                {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
                {!canEdit && (
                  <p className="text-xs text-gray-400">Only admins and owners can rename the workspace.</p>
                )}
              </div>

              <div className="pt-2 flex gap-6 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Created{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {workspace ? new Date(workspace.createdAt).toLocaleDateString() : '—'}
                  </span>
                </span>
                <span>
                  Your role{' '}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {workspace?.role ?? '—'}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Team Members shortcut */}
          <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage who has access to this workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/members">
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {workspace?._count?.members ?? '—'} member
                        {(workspace?._count?.members ?? 0) !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-gray-500">Invite, remove, and manage roles</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            </CardContent>
          </Card>
          {/* Integrations shortcut */}
          <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Manage connected data sources.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/connect">
                <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Plug className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Connected Accounts</p>
                      <p className="text-xs text-gray-500">Google, Meta, TikTok, LinkedIn, WordPress</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Danger Zone — OWNER only */}
          {workspace?.role === 'OWNER' && (
            <Card className="dark:bg-gray-900 border-red-200 dark:border-red-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                  <Trash2 className="w-4 h-4" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible actions for this workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger>
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Delete Workspace
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete <strong>{workspace?.name}</strong> and all its data.
                        This action cannot be undone.
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
        </>
      )}
    </div>
  )
}
