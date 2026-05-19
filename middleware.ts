import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
const { auth } = NextAuth(authConfig);

async function verifyAdminCookie(token: string): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET ?? 'dev-admin-secret'
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sigBytes = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
    const expected = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('')
    if (sig !== expected) return false
    const { exp } = JSON.parse(atob(payload))
    return Date.now() < exp
  } catch { return false }
}

async function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdminLogin = pathname === '/admin/login'
  const adminToken = req.cookies.get('admin_token')?.value
  const isValidAdmin = adminToken ? await verifyAdminCookie(adminToken) : false

  if (isAdminLogin) {
    if (isValidAdmin) return NextResponse.redirect(new URL('/admin', req.url))
    return NextResponse.next()
  }
  if (!isValidAdmin) return NextResponse.redirect(new URL('/admin/login', req.url))
  return NextResponse.next()
}

const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '10 s'),
    })
  : null;

export default auth(async (req) => {
  const { pathname } = req.nextUrl

  // Admin routes — completely separate auth
  if (pathname.startsWith('/admin')) return handleAdminRoutes(req)

  const session = req.auth

  // Admin API routes — handled separately (no NextAuth session needed)
  if (pathname.startsWith('/api/admin')) return NextResponse.next()

  // Rate limit API routes
  if (pathname.startsWith('/api') && ratelimit) {
    const ip = req.ip ?? '127.0.0.1'
    const { success, limit, reset, remaining } = await ratelimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      })
    }
  }

  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/api/portal') ||
    pathname === '/api/health' ||
    pathname === '/login' ||
    pathname === '/register'

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if ((pathname === '/login' || pathname === '/register') && session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
