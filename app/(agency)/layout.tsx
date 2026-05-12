import { ReactNode } from 'react'
import { AgencyNav } from '@/components/agency-nav'

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <AgencyNav />
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
