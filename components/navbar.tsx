'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut, useSession } from 'next-auth/react'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/ga4': 'Google Analytics',
  '/google-ads': 'Google Ads',
  '/search-console': 'Search Console',
  '/meta-ads': 'Meta Ads',
  '/connect': 'Connect Accounts',
  '/settings': 'Settings',
  '/settings/members': 'Team Members',
  '/profile': 'My Profile',
  '/reports': 'Reports',
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const title = PAGE_TITLES[pathname] ?? 'Overview'
  const initials = (session?.user?.name ?? session?.user?.email ?? 'U')[0].toUpperCase()

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 ring-blue-500"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{session?.user?.name ?? session?.user?.email ?? 'My Account'}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await signOut({ redirect: false })
              router.push('/login')
              router.refresh()
            }}
            className="text-red-600 dark:text-red-400 cursor-pointer"
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
