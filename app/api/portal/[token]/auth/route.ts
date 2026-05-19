import { prisma } from '@/lib/db'
import { scryptSync, timingSafeEqual, createHmac } from 'crypto'
import { z } from 'zod'

function verifyPortalPassword(submitted: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  try {
    const derived = scryptSync(submitted, salt, 64)
    return timingSafeEqual(Buffer.from(hash, 'hex'), derived)
  } catch { return false }
}

function makePortalCookieValue(portalToken: string): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000
  const payload = `${portalToken}.${exp}`
  const sig = createHmac('sha256', process.env.ADMIN_SECRET ?? 'dev-secret')
    .update(payload)
    .digest('hex')
  return `${payload}.${sig}`
}

const bodySchema = z.object({ password: z.string().min(1) })

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const { token } = params

  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const workspace = await prisma.workspace.findUnique({
    where: { portalToken: token },
    select: { portalEnabled: true, portalPassword: true },
  })

  if (!workspace || !workspace.portalEnabled) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (!workspace.portalPassword) {
    return Response.json({ error: 'No password required' }, { status: 400 })
  }

  if (!verifyPortalPassword(parsed.data.password, workspace.portalPassword)) {
    return Response.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const cookieValue = makePortalCookieValue(token)
  return Response.json({ ok: true }, {
    headers: {
      'Set-Cookie': `portal_session=${cookieValue}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24}`,
    },
  })
}
