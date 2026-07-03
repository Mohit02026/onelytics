'use client'

import { useSession } from 'next-auth/react'
import type { ReactNode } from 'react'

export function WorkspaceContent({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const workspaceId = session?.user?.workspaceId ?? 'loading'
  return <div key={workspaceId} className="contents">{children}</div>
}
