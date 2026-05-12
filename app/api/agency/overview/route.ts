import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: userId, organizationId } = session.user

  if (!organizationId) {
    return NextResponse.json({ error: 'No organisation' }, { status: 404 })
  }

  // Only org OWNER can access the agency overview
  const orgMembership = await prisma.orgMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  })
  if (!orgMembership || orgMembership.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, logoUrl: true, color: true },
  })

  // Get all workspaces in the org
  const workspaces = await prisma.workspace.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      clientLogoUrl: true,
      clientColor: true,
      createdAt: true,
      _count: { select: { members: true, reports: true } },
      connectedAccounts: { select: { provider: true } },
    },
  })

  const result = workspaces.map((ws) => ({
    id: ws.id,
    name: ws.name,
    logoUrl: ws.clientLogoUrl,
    color: ws.clientColor ?? '#2563eb',
    memberCount: ws._count.members,
    reportCount: ws._count.reports,
    connectedCount: ws.connectedAccounts.length,
    connectedProviders: ws.connectedAccounts.map((a) => a.provider),
    isActive: ws.id === session.user.workspaceId,
  }))

  return NextResponse.json({ org, workspaces: result })
}
