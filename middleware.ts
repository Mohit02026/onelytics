import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const { auth } = NextAuth(authConfig);

const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '10 s'),
    })
  : null;

export default auth(async (req) => {
  const session = req.auth
  const { pathname } = req.nextUrl

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
