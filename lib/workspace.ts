import { prisma } from '@/lib/db'
import type { MemberRole } from '@prisma/client'

export type { MemberRole }

// Returns membership, creating an OWNER entry lazily for users who pre-date the WorkspaceMember table.
export async function getMembership(userId: string, workspaceId: string) {
  let membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })

  if (!membership) {
    // Check the user actually owns this workspace (pre-Phase 7 user)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    })
    if (user?.workspaceId === workspaceId) {
      membership = await prisma.workspaceMember.create({
        data: { workspaceId, userId, role: 'OWNER' },
      })
    }
  }

  return membership
}

export function canManageMembers(role: MemberRole) {
  return role === 'OWNER' || role === 'ADMIN'
}

export function canEdit(role: MemberRole) {
  return role !== 'VIEWER'
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}
