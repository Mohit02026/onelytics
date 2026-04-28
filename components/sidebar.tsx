'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  BarChart3,
  Search,
  Share2,
  Settings,
  Activity,
  Plug,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Google Analytics', href: '/ga4', icon: BarChart3 },
  { name: 'Google Ads', href: '/google-ads', icon: Activity },
  { name: 'Search Console', href: '/search-console', icon: Search },
  { name: 'Meta Ads', href: '/meta-ads', icon: Share2 },
  { name: 'Connect Accounts', href: '/connect', icon: Plug },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [connectedCount, setConnectedCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/integrations/status')
      .then((r) => r.json())
      .then((s) => {
        const count = [s.google, s.meta].filter(Boolean).length
        setConnectedCount(count)
      })
      .catch(() => setConnectedCount(0))
  }, [pathname]) // re-check after navigation so connect/disconnect reflects immediately

  return (
    <div className="w-[220px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs">O</span>
          </div>
          <span>Onelytics</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 flex flex-col gap-1 overflow-y-auto">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-500'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          )
        })}
      </div>

      {/* Status Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Connections
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 py-1">
          <span className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                connectedCount && connectedCount > 0
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
            Integrations
          </span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {connectedCount ?? '—'}/4
          </Badge>
        </div>
      </div>
    </div>
  )
}
