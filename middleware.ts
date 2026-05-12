import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createHmac } from 'crypto';

const { auth } = NextAuth(authConfig);

function verifyAdminCookie(token: string): boolean {
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

function handleAdminRoutes(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAdminLogin = pathname === '/admin/login'
  const adminToken = req.cookies.get('admin_token')?.value
  const isValidAdmin = adminToken ? verifyAdminCookie(adminToken) : false

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
