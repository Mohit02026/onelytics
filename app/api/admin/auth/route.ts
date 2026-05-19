import { NextResponse } from 'next/server'

async function makeAdminToken(): Promise<string> {
  const secret = process.env.ADMIN_SECRET ?? 'dev-admin-secret'
  const payload = btoa(JSON.stringify({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const sig = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('')
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

  const token = await makeAdminToken()
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
