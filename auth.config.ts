import type { NextAuthConfig } from 'next-auth';

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
      
      if (isApiAuthRoute || isInviteRoute) return true;
      
      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore - workspaceId comes from custom user type
        token.workspaceId = user.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.workspaceId && session.user) {
        session.user.workspaceId = token.workspaceId as string;
      }
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  providers: [],
} satisfies NextAuthConfig;
