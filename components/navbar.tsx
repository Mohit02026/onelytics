'use client';

import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { signOut } from 'next-auth/react';

export function Navbar() {
  const pathname = usePathname();

  // Simple title mapper
  const getTitle = () => {
    switch (pathname) {
      case '/': return 'Dashboard';
      case '/ga4': return 'Google Analytics';
      case '/google-ads': return 'Google Ads';
      case '/search-console': return 'Search Console';
      case '/meta-ads': return 'Meta Ads';
      case '/settings': return 'Settings';
      default: return 'Overview';
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {getTitle()}
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Placeholder for Date Range Picker */}
        <div className="hidden sm:flex items-center px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          Last 30 Days
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none ring-offset-2 focus-visible:ring-2 ring-blue-500">
              <Avatar className="w-8 h-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  U
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="mailto:support@onelytics.com">Support</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-red-600 dark:text-red-400 cursor-pointer"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
