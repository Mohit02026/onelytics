import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

function makeAdminToken(): string {
  const secret = process.env.ADMIN_SECRET ?? 'dev-admin-secret'
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64')
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}))

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 })
  }

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = makeAdminToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('admin_token')
  return res
}
