'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Users, FileText, Plug, ArrowRight, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface WorkspaceSummary {
  id: string
  name: string
  logoUrl: string | null
  color: string
  memberCount: number
  reportCount: number
  connectedCount: number
  connectedProviders: string[]
  isActive: boolean
}

interface OrgData {
  org: { id: string; name: string; logoUrl: string | null; color: string | null }
  workspaces: WorkspaceSummary[]
}

export default function AgencyPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [data, setData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetch('/api/agency/overview')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d) })
      .finally(() => setLoading(false))
  }, [])

  async function enterWorkspace(workspaceId: string) {
    if (switching) return
    setSwitching(workspaceId)
    try {
      const res = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      if (res.ok) {
        await update({ workspaceId })
        router.push('/')
      }
    } finally {
      setSwitching(null)
    }
  }

  async function createWorkspace() {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const d = await res.json()
      if (res.ok) {
        setNewName('')
        setShowCreate(false)
        await enterWorkspace(d.id)
      }
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-16 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading agency…</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-2">
        <p className="text-gray-900 dark:text-white font-medium">Access restricted</p>
        <p className="text-sm text-gray-500">Agency overview is only available to the organisation owner.</p>
      </div>
    )
  }

  const { org, workspaces } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
            style={{ backgroundColor: org.color ?? '#2563eb' }}
          >
            {org.name[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{org.name}</h2>
            <p className="text-sm text-gray-500">{workspaces.length} client workspace{workspaces.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/org-settings">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Agency Settings
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Client
          </Button>
        </div>
      </div>

      {/* New workspace form */}
      {showCreate && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 flex items-center gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Client workspace name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createWorkspace()
              if (e.key === 'Escape') { setShowCreate(false); setNewName('') }
            }}
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            size="sm"
            onClick={createWorkspace}
            disabled={!newName.trim() || creating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create & Enter'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setNewName('') }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Workspace grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((ws) => (
          <div
            key={ws.id}
            className={`rounded-xl border bg-white dark:bg-gray-900 p-5 flex flex-col gap-4 transition-shadow hover:shadow-md ${
              ws.isActive
                ? 'border-blue-200 dark:border-blue-700 ring-1 ring-blue-200 dark:ring-blue-700'
                : 'border-gray-200 dark:border-gray-800'
            }`}
          >
            {/* Workspace header */}
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: ws.color }}
              >
                {ws.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{ws.name}</p>
                {ws.isActive && (
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Active workspace</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={Plug} value={ws.connectedCount} label="Connected" />
              <Stat icon={FileText} value={ws.reportCount} label="Reports" />
              <Stat icon={Users} value={ws.memberCount} label="Members" />
            </div>

            {/* Connected providers */}
            {ws.connectedProviders.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ws.connectedProviders.slice(0, 4).map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium capitalize"
                  >
                    {p}
                  </span>
                ))}
                {ws.connectedProviders.length > 4 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                    +{ws.connectedProviders.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Action */}
            {ws.isActive ? (
              <Link href="/">
                <Button size="sm" variant="outline" className="w-full">
                  View Dashboard
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => enterWorkspace(ws.id)}
                disabled={switching === ws.id}
              >
                {switching === ws.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <>Enter workspace <ArrowRight className="w-3 h-3 ml-1" /></>
                }
              </Button>
            )}
          </div>
        ))}

        {/* Add workspace card */}
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 dark:hover:border-blue-700 transition-colors min-h-[180px]"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">New client workspace</span>
        </button>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-2 py-2 text-center">
      <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5 mt-0.5">
        <Icon className="w-2.5 h-2.5" />{label}
      </p>
    </div>
  )
}
