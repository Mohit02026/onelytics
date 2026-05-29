import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { authConfig } from "@/auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { email: rawEmail, password } = parsedCredentials.data;
        const email = rawEmail.toLowerCase();

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (!passwordsMatch) return null;

          // Lazy org bootstrap for users created before the Organization model existed
          if (!user.organizationId) {
            await prisma.$transaction(async (tx) => {
              const newOrg = await tx.organization.create({
                data: { name: user.name ? `${user.name}'s Agency` : 'My Agency' },
              })
              await tx.workspace.update({
                where: { id: user.workspaceId },
                data: { organizationId: newOrg.id },
              })
              await tx.user.update({
                where: { id: user.id },
                data: { organizationId: newOrg.id },
              })
              await tx.orgMember.upsert({
                where: { organizationId_userId: { organizationId: newOrg.id, userId: user.id } },
                create: { organizationId: newOrg.id, userId: user.id, role: 'OWNER' },
                update: {},
              })
            })
          }

          // Only standard fields needed — JWT callback reads custom fields from DB
          return { id: user.id, email: user.email ?? "", name: user.name ?? "" };
        } catch (err) {
          console.error('[auth] authorize error:', err)
          throw new Error('Authentication service unavailable. Please try again.')
        }
      }
    })
  ],
  callbacks: {
    // Preserve the edge-safe `authorized` guard from authConfig
    ...authConfig.callbacks,

    // Runs server-side (Node runtime) — safe to use Prisma here.
    // Query DB directly so custom fields are always reliable regardless of
    // whether NextAuth v5 beta passes them through the `user` parameter.
    async jwt({ token, user, trigger, session: sessionData }) {
      if (user) {
        token.id = user.id as string

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { workspaceId: true, organizationId: true, onboarded: true },
        })

        token.workspaceId = dbUser?.workspaceId ?? ''
        token.organizationId = dbUser?.organizationId ?? undefined
        token.onboarded = dbUser?.onboarded ?? false

        if (dbUser?.organizationId) {
          const orgMember = await prisma.orgMember.findUnique({
            where: {
              organizationId_userId: {
                organizationId: dbUser.organizationId,
                userId: user.id as string,
              },
            },
            select: { role: true },
          })
          token.orgRole = orgMember?.role ?? undefined
        }
      }

      if (trigger === 'update') {
        if (sessionData?.workspaceId) token.workspaceId = sessionData.workspaceId as string
        if (sessionData?.onboarded !== undefined) token.onboarded = sessionData.onboarded as boolean
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.id) session.user.id = token.id as string
        if (token.workspaceId) session.user.workspaceId = token.workspaceId as string
        if (token.organizationId) session.user.organizationId = token.organizationId as string
        session.user.onboarded = (token.onboarded as boolean) ?? false
        if (token.orgRole) session.user.orgRole = token.orgRole as string
      }
      return session
    },
  },
})
