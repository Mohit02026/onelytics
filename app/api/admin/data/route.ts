import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/db'

function isAdminAuth(): boolean {
  const token = cookies().get('admin_token')?.value
  if (!token) return false
  const secret = process.env.ADMIN_SECRET ?? 'dev-admin-secret'
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  if (sig !== expected) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64').toString())
    return Date.now() < exp
  } catch { return false }
}

export async function GET(req: Request) {
  if (!isAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'overview'

  if (tab === 'overview') {
    const [orgs, workspaces, users, reports] = await Promise.all([
      prisma.organization.count(),
      prisma.workspace.count(),
      prisma.user.count(),
      prisma.generatedReport.count(),
    ])
    return NextResponse.json({ orgs, workspaces, users, reports })
  }

  if (tab === 'orgs') {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { workspaces: true, members: true } },
      },
    })
    return NextResponse.json(orgs)
  }

  if (tab === 'workspaces') {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { name: true } },
        _count: { select: { members: true, reports: true, connectedAccounts: true } },
      },
    })
    return NextResponse.json(workspaces)
  }

  if (tab === 'users') {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        workspaceId: true, organizationId: true, jobTitle: true,
        workspace: { select: { name: true } },
        orgMemberships: { select: { role: true, organization: { select: { name: true } } } },
      },
    })
    return NextResponse.json(users)
  }

  if (tab === 'reports') {
    const reports = await prisma.generatedReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { workspace: { select: { name: true } } },
    })
    return NextResponse.json(reports)
  }

  return NextResponse.json({ error: 'Unknown tab' }, { status: 400 })
}

export async function DELETE(req: Request) {
  if (!isAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, id } = await req.json().catch(() => ({}))
  if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 })

  try {
    if (type === 'org') await prisma.organization.delete({ where: { id } })
    else if (type === 'workspace') await prisma.workspace.delete({ where: { id } })
    else if (type === 'user') await prisma.user.delete({ where: { id } })
    else if (type === 'report') await prisma.generatedReport.delete({ where: { id } })
    else return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Delete failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
