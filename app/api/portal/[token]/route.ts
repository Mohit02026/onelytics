import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHmac } from 'crypto'

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';')
      .map(c => c.trim())
      .filter(Boolean)
      .map(c => {
        const idx = c.indexOf('=')
        return idx === -1 ? [c, ''] : [c.slice(0, idx).trim(), c.slice(idx + 1).trim()]
      })
  )
}

function verifyPortalCookie(cookieHeader: string | null, portalToken: string): boolean {
  const cookies = parseCookies(cookieHeader)
  const value = cookies['portal_session']
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 3) return false
  const [token, expStr, sig] = parts
  if (token !== portalToken) return false
  if (Date.now() > Number(expStr)) return false
  const payload = `${token}.${expStr}`
  const expected = createHmac('sha256', process.env.ADMIN_SECRET ?? 'dev-secret')
    .update(payload)
    .digest('hex')
  return sig === expected
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const { token } = params

  const workspace = await prisma.workspace.findUnique({
    where: { portalToken: token },
    select: {
      name: true,
      clientLogoUrl: true,
      clientColor: true,
      portalEnabled: true,
      portalPassword: true,
      reports: {
        where: { status: 'READY' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, startDate: true, endDate: true, createdAt: true },
      },
    },
  })

  if (!workspace || !workspace.portalEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const publicInfo = {
    name: workspace.name,
    logoUrl: workspace.clientLogoUrl,
    color: workspace.clientColor ?? '#2563eb',
  }

  if (workspace.portalPassword) {
    const cookieHeader = req.headers.get('cookie')
    if (!verifyPortalCookie(cookieHeader, token)) {
      return NextResponse.json({ passwordRequired: true, ...publicInfo })
    }
  }

  return NextResponse.json({ ...publicInfo, reports: workspace.reports })
}
