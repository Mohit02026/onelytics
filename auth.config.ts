import type { NextAuthConfig } from 'next-auth';

// Edge-safe config — used by middleware only.
// Only the `authorized` guard lives here; no Prisma, no Node-only imports.
// JWT and session callbacks are in lib/auth.ts (Node runtime, DB access).
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
      const isAuthRoute = nextUrl.pathname === '/login' || nextUrl.pathname === '/register';
      const isInviteRoute = nextUrl.pathname.startsWith('/invite/');
      const isPortalRoute = nextUrl.pathname.startsWith('/portal/');

      if (isApiAuthRoute || isInviteRoute || isPortalRoute) return true;

      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      if (!isLoggedIn) return false;
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
