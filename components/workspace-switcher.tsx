'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Check, Plus, Loader2, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkspaceOption {
  id: string
  name: string
  logoUrl: string | null
  color: string
  role: string
  isActive: boolean
}

export function WorkspaceSwitcher() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) loadWorkspaces()
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreate(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadWorkspaces() {
    setLoading(true)
    try {
      const res = await fetch('/api/workspaces')
      const d = await res.json()
      if (res.ok) setWorkspaces(d.workspaces)
    } finally {
      setLoading(false)
    }
  }

  async function switchWorkspace(workspaceId: string) {
    if (switching) return
    setSwitching(workspaceId)
    try {
      const res = await fetch('/api/workspace/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      if (res.ok) {
        // Update the JWT token to reflect the new workspace
        await update({ workspaceId })
        setOpen(false)
        router.refresh()
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
        await switchWorkspace(d.id)
      }
    } finally {
      setCreating(false)
    }
  }

  const active = workspaces.find((w) => w.isActive)
  const activeColor = active?.color ?? '#2563eb'
  const activeName = active?.name ?? session?.user?.workspaceId?.slice(0, 8) ?? 'Workspace'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
      >
        {/* Workspace avatar */}
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: activeColor }}
        >
          {activeName[0]?.toUpperCase() ?? 'W'}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
            {activeName}
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">{active?.role ?? 'OWNER'}</p>
        </div>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
          <div className="p-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => !ws.isActive && switchWorkspace(ws.id)}
                    disabled={switching === ws.id}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors',
                      ws.isActive
                        ? 'bg-blue-50 dark:bg-blue-950/40 cursor-default'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                    )}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: ws.color }}
                    >
                      {ws.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {ws.name}
                      </p>
                    </div>
                    {switching === ws.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 shrink-0" />
                    ) : ws.isActive ? (
                      <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    ) : null}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Create workspace */}
          <div className="border-t border-gray-100 dark:border-gray-800 p-1.5">
            {showCreate ? (
              <div className="flex items-center gap-2 px-2 py-1.5">
                <input
                  autoFocus
                  type="text"
                  placeholder="Workspace name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createWorkspace()
                    if (e.key === 'Escape') { setShowCreate(false); setNewName('') }
                  }}
                  className="flex-1 text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none py-0.5 text-gray-900 dark:text-white placeholder:text-gray-400"
                />
                <button
                  onClick={createWorkspace}
                  disabled={!newName.trim() || creating}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
