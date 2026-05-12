'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Building2 } from 'lucide-react'

interface InviteInfo {
  orgName: string
  email: string
  role: string
  expiresAt: string
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
}

export default function OrgInvitePage() {
  const { token } = useParams<{ token: string }>()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/invite/org/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setLoadError(d.error); else setInvite(d) })
      .catch(() => setLoadError('Failed to load invite.'))
  }, [token])

  async function accept() {
    if (!session) {
      router.push(`/login?callbackUrl=/invite/org/${token}`)
      return
    }
    setAccepting(true)
    setAcceptError(null)
    try {
      const res = await fetch(`/api/invite/org/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setAcceptError(data.error ?? 'Failed to join organisation.')
      } else {
        setAccepted(true)
        setTimeout(() => router.push('/'), 2000)
      }
    } catch {
      setAcceptError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl">Agency Invitation</CardTitle>
          <CardDescription>You&apos;ve been invited to join an agency on Onelytics</CardDescription>
        </CardHeader>
        <CardContent>
          {!invite && !loadError && (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading invite…</span>
            </div>
          )}

          {loadError && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <XCircle className="w-10 h-10 text-red-500" />
              <p className="font-medium text-gray-900 dark:text-white">Invalid Invite</p>
              <p className="text-sm text-gray-500">{loadError}</p>
              <Button variant="outline" onClick={() => router.push('/')}>Go to Dashboard</Button>
            </div>
          )}

          {accepted && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <p className="font-medium text-gray-900 dark:text-white">Joined successfully!</p>
              <p className="text-sm text-gray-500">Redirecting you to the dashboard…</p>
            </div>
          )}

          {invite && !accepted && (
            <div className="space-y-5">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Agency</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{invite.orgName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Invited email</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{invite.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Role</span>
                  <Badge variant="secondary">{ROLE_LABELS[invite.role] ?? invite.role}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Expires</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center px-2">
                Joining as an agency member gives you access to all client workspaces in this organisation.
              </p>

              {session && (
                <p className="text-xs text-gray-500 text-center">
                  Signed in as <span className="font-medium">{session.user?.email}</span>
                </p>
              )}

              {acceptError && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center">{acceptError}</p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => router.push('/')} disabled={accepting}>
                  Decline
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={accept}
                  disabled={accepting || status === 'loading'}
                >
                  {accepting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining…</>
                  ) : session ? 'Accept & Join' : 'Sign in to Accept'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
