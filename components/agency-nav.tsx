'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { LogOut, Settings, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function AgencyNav() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = session?.user?.name
    ? session.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-6 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 font-bold text-base tracking-tight mr-4">
        <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs">O</span>
        </div>
        <span className="text-gray-900 dark:text-white">Onelytics</span>
        <span className="text-gray-300 dark:text-gray-600 mx-1">/</span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">Agency</span>
      </div>

      <div className="flex-1" />

      {/* Nav links */}
      <Link
        href="/org-settings"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <Settings className="w-4 h-4" />
        Settings
      </Link>

      {/* User menu */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
            {initials}
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block max-w-[120px] truncate">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50 py-1 overflow-hidden">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Back to workspace
            </Link>
            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
