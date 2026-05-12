'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Shield, LogOut, Trash2, X, Building2, Layers, Users, FileText, LayoutDashboard } from 'lucide-react'

type Tab = 'overview' | 'orgs' | 'workspaces' | 'users' | 'reports'

interface OverviewData { orgs: number; workspaces: number; users: number; reports: number }
interface OrgRow { id: string; name: string; createdAt: string; _count: { workspaces: number; members: number } }
interface WorkspaceRow { id: string; name: string; createdAt: string; organization: { name: string } | null; _count: { members: number; reports: number; connectedAccounts: number } }
interface UserRow { id: string; name: string | null; email: string; createdAt: string; jobTitle: string | null; workspace: { name: string } | null; orgMemberships: { role: string; organization: { name: string } }[] }
interface ReportRow { id: string; name: string; createdAt: string; workspace: { name: string } | null }

interface DeleteTarget { type: 'org' | 'workspace' | 'user' | 'report'; id: string; label: string }

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [data, setData] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const fetchData = useCallback(async (t: Tab) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/data?tab=${t}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData(tab) }, [tab, fetchData])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: deleteTarget.type, id: deleteTarget.id }),
      })
      if (res.ok) { setDeleteTarget(null); fetchData(tab) }
    } finally {
      setDeleting(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { key: 'orgs', label: 'Organisations', icon: <Building2 className="w-3.5 h-3.5" /> },
    { key: 'workspaces', label: 'Workspaces', icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'users', label: 'Users', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'reports', label: 'Reports', icon: <FileText className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="font-semibold text-sm tracking-tight">Admin Panel</span>
          <span className="text-gray-600 text-xs ml-2">Internal use only</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          Sign out
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          </div>
        ) : (
          <>
            {tab === 'overview' && <OverviewTab data={data as OverviewData} />}
            {tab === 'orgs' && <OrgsTab rows={data as OrgRow[]} onDelete={(r) => setDeleteTarget({ type: 'org', id: r.id, label: r.name })} />}
            {tab === 'workspaces' && <WorkspacesTab rows={data as WorkspaceRow[]} onDelete={(r) => setDeleteTarget({ type: 'workspace', id: r.id, label: r.name })} />}
            {tab === 'users' && <UsersTab rows={data as UserRow[]} onDelete={(r) => setDeleteTarget({ type: 'user', id: r.id, label: r.email })} />}
            {tab === 'reports' && <ReportsTab rows={data as ReportRow[]} onDelete={(r) => setDeleteTarget({ type: 'report', id: r.id, label: r.name })} />}
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-950 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="font-semibold text-sm">Confirm delete</h3>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="text-gray-600 hover:text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-1">
              This will permanently delete:
            </p>
            <p className="text-sm font-medium text-white bg-gray-800 rounded-lg px-3 py-2 mb-4 truncate">
              {deleteTarget.label}
            </p>
            <p className="text-xs text-red-400 mb-4">
              This action cannot be undone. All related data will be removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-3 py-2 text-xs rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="text-gray-600">{icon}</div>
      </div>
      <p className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

function OverviewTab({ data }: { data: OverviewData }) {
  if (!data) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Organisations" value={data.orgs} icon={<Building2 className="w-4 h-4" />} />
      <StatCard label="Workspaces" value={data.workspaces} icon={<Layers className="w-4 h-4" />} />
      <StatCard label="Users" value={data.users} icon={<Users className="w-4 h-4" />} />
      <StatCard label="Reports" value={data.reports} icon={<FileText className="w-4 h-4" />} />
    </div>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-800">{children}</th>
}

function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-sm border-b border-gray-800/50 ${className}`}>{children}</td>
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}

function OrgsTab({ rows, onDelete }: { rows: OrgRow[]; onDelete: (r: OrgRow) => void }) {
  if (!rows?.length) return <EmptyState label="No organisations" />
  return (
    <TableWrap>
      <thead>
        <tr><Th>Name</Th><Th>Workspaces</Th><Th>Members</Th><Th>Created</Th><Th></Th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="hover:bg-gray-800/30">
            <Td><span className="font-medium text-white">{r.name}</span><span className="block text-xs text-gray-600 font-mono">{r.id}</span></Td>
            <Td className="text-gray-400">{r._count.workspaces}</Td>
            <Td className="text-gray-400">{r._count.members}</Td>
            <Td className="text-gray-500">{fmt(r.createdAt)}</Td>
            <Td><DeleteBtn onClick={() => onDelete(r)} /></Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )
}

function WorkspacesTab({ rows, onDelete }: { rows: WorkspaceRow[]; onDelete: (r: WorkspaceRow) => void }) {
  if (!rows?.length) return <EmptyState label="No workspaces" />
  return (
    <TableWrap>
      <thead>
        <tr><Th>Name</Th><Th>Organisation</Th><Th>Members</Th><Th>Reports</Th><Th>Integrations</Th><Th>Created</Th><Th></Th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="hover:bg-gray-800/30">
            <Td><span className="font-medium text-white">{r.name}</span><span className="block text-xs text-gray-600 font-mono">{r.id}</span></Td>
            <Td className="text-gray-400">{r.organization?.name ?? <span className="text-gray-700">—</span>}</Td>
            <Td className="text-gray-400">{r._count.members}</Td>
            <Td className="text-gray-400">{r._count.reports}</Td>
            <Td className="text-gray-400">{r._count.connectedAccounts}</Td>
            <Td className="text-gray-500">{fmt(r.createdAt)}</Td>
            <Td><DeleteBtn onClick={() => onDelete(r)} /></Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )
}

function UsersTab({ rows, onDelete }: { rows: UserRow[]; onDelete: (r: UserRow) => void }) {
  if (!rows?.length) return <EmptyState label="No users" />
  return (
    <TableWrap>
      <thead>
        <tr><Th>User</Th><Th>Workspace</Th><Th>Org / Role</Th><Th>Job title</Th><Th>Joined</Th><Th></Th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="hover:bg-gray-800/30">
            <Td>
              <span className="font-medium text-white">{r.name ?? <span className="text-gray-600">No name</span>}</span>
              <span className="block text-xs text-gray-500">{r.email}</span>
            </Td>
            <Td className="text-gray-400">{r.workspace?.name ?? <span className="text-gray-700">—</span>}</Td>
            <Td>
              {r.orgMemberships.length > 0
                ? r.orgMemberships.map((m, i) => (
                    <span key={i} className="block text-xs text-gray-400">
                      {m.organization.name} <span className="text-gray-600">({m.role})</span>
                    </span>
                  ))
                : <span className="text-gray-700">—</span>
              }
            </Td>
            <Td className="text-gray-400">{r.jobTitle ?? <span className="text-gray-700">—</span>}</Td>
            <Td className="text-gray-500">{fmt(r.createdAt)}</Td>
            <Td><DeleteBtn onClick={() => onDelete(r)} /></Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )
}

function ReportsTab({ rows, onDelete }: { rows: ReportRow[]; onDelete: (r: ReportRow) => void }) {
  if (!rows?.length) return <EmptyState label="No reports" />
  return (
    <TableWrap>
      <thead>
        <tr><Th>Name</Th><Th>Workspace</Th><Th>Created</Th><Th></Th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id} className="hover:bg-gray-800/30">
            <Td><span className="font-medium text-white">{r.name}</span><span className="block text-xs text-gray-600 font-mono">{r.id}</span></Td>
            <Td className="text-gray-400">{r.workspace?.name ?? <span className="text-gray-700">—</span>}</Td>
            <Td className="text-gray-500">{fmt(r.createdAt)}</Td>
            <Td><DeleteBtn onClick={() => onDelete(r)} /></Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center h-48 text-gray-600 text-sm">
      {label}
    </div>
  )
}
