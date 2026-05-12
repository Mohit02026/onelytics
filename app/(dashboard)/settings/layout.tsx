'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Users, Plug, Globe, ChevronRight } from 'lucide-react'

const NAV = [
  { href: '/settings', label: 'General', icon: Settings, exact: true },
  { href: '/settings/members', label: 'Members & Roles', icon: Users, exact: false },
  { href: '/settings/integrations', label: 'Integrations', icon: Plug, exact: false },
  { href: '/settings/portal', label: 'Client Portal', icon: Globe, exact: false },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your workspace, team, and integrations.
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
