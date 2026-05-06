'use client'

import { useEffect, useState } from 'react'
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
import { Loader2, User, Shield, Building2, Trash2, Check } from 'lucide-react'
import { signOut } from 'next-auth/react'

interface ProfileData {
  id: string
  name: string | null
  email: string
  hasPassword: boolean
  workspaces: { id: string; name: string; role: string }[]
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Name edit
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Password change
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  // Delete account
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.id) {
          setProfile(d)
          setNameInput(d.name ?? '')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function saveName() {
    if (!nameInput.trim()) return
    setSavingName(true)
    setNameError(null)
    setNameSaved(false)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      const d = await res.json()
      if (!res.ok) setNameError(d.error ?? 'Failed to save')
      else {
        setNameSaved(true)
        setProfile((p) => p ? { ...p, name: nameInput.trim() } : p)
        setTimeout(() => setNameSaved(false), 2000)
      }
    } catch {
      setNameError('Something went wrong')
    } finally {
      setSavingName(false)
    }
  }

  async function changePassword() {
    if (!newPw || newPw !== confirmPw) {
      setPwError('New passwords do not match')
      return
    }
    setSavingPw(true)
    setPwError(null)
    setPwSaved(false)
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const d = await res.json()
      if (!res.ok) setPwError(d.error ?? 'Failed to update password')
      else {
        setPwSaved(true)
        setCurrentPw('')
        setNewPw('')
        setConfirmPw('')
        setTimeout(() => setPwSaved(false), 2000)
      }
    } catch {
      setPwError('Something went wrong')
    } finally {
      setSavingPw(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      await fetch('/api/user', { method: 'DELETE' })
      await signOut({ redirect: false })
      router.push('/login')
    } finally {
      setDeleting(false)
    }
  }

  const initials = (profile?.name ?? profile?.email ?? 'U')[0].toUpperCase()

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your personal account.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          {/* Personal Info */}
          <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" />
                Personal Info
              </CardTitle>
              <CardDescription>Your display name shown to workspace members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{initials}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{profile?.name ?? '(no name)'}</p>
                  <p className="text-sm text-gray-500">{profile?.email}</p>
                </div>
              </div>

              {/* Name edit */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                <div className="flex gap-3 max-w-sm">
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700"
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  />
                  <Button
                    onClick={saveName}
                    disabled={savingName || !nameInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  >
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : nameSaved ? <Check className="w-4 h-4" /> : 'Save'}
                  </Button>
                </div>
                {nameError && <p className="text-sm text-red-600 dark:text-red-400">{nameError}</p>}
              </div>

              {/* Email read-only */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <Input
                  value={profile?.email ?? ''}
                  disabled
                  className="max-w-sm dark:bg-gray-800 dark:border-gray-700 text-gray-500"
                />
                <p className="text-xs text-gray-400">Email address cannot be changed.</p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-4 h-4" />
                Security
              </CardTitle>
              <CardDescription>Update your password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!profile?.hasPassword ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  You signed in via Google OAuth — password management is not available.
                </p>
              ) : (
                <div className="space-y-3 max-w-sm">
                  <Input
                    type="password"
                    placeholder="Current password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700"
                  />
                  <Input
                    type="password"
                    placeholder="New password (min 8 chars)"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700"
                  />
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700"
                  />
                  {pwError && <p className="text-sm text-red-600 dark:text-red-400">{pwError}</p>}
                  <Button
                    onClick={changePassword}
                    disabled={savingPw || !currentPw || !newPw || !confirmPw}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : pwSaved ? 'Password updated!' : 'Update Password'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workspaces */}
          <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4" />
                My Workspaces
              </CardTitle>
              <CardDescription>Workspaces you belong to and your role in each.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {(profile?.workspaces ?? []).map((ws) => (
                  <div key={ws.id} className="flex items-center justify-between px-6 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{ws.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                      {ws.role.charAt(0) + ws.role.slice(1).toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="dark:bg-gray-900 border-red-200 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                <Trash2 className="w-4 h-4" />
                Danger Zone
              </CardTitle>
              <CardDescription>Permanently delete your account and all associated data.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your account and remove you from all workspaces. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteAccount}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Account'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
