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
      const isPortalRoute = nextUrl.pathname.startsWith('/portal/');

      if (isApiAuthRoute || isInviteRoute || isPortalRoute) return true;

      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }
      return true;
    },
    async jwt({ token, user, trigger, session: sessionData }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.workspaceId = user.workspaceId;
        // @ts-ignore
        token.organizationId = user.organizationId;
        // @ts-ignore
        token.onboarded = user.onboarded;
        // @ts-ignore
        token.orgRole = user.orgRole;
      }
      if (trigger === 'update') {
        if (sessionData?.workspaceId) token.workspaceId = sessionData.workspaceId;
        if (sessionData?.onboarded !== undefined) token.onboarded = sessionData.onboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string;
        if (token.workspaceId) session.user.workspaceId = token.workspaceId as string;
        if (token.organizationId) session.user.organizationId = token.organizationId as string;
        session.user.onboarded = (token.onboarded as boolean) ?? false;
        if (token.orgRole) session.user.orgRole = token.orgRole as string;
      }
      return session;
    }
  },
  providers: [],
} satisfies NextAuthConfig;
