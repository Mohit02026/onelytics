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

        if (parsedCredentials.success) {
          const { email: rawEmail, password } = parsedCredentials.data;
          const email = rawEmail.toLowerCase()
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) {
            let organizationId = user.organizationId ?? undefined

            // Lazy org bootstrap for users created before the Organization model existed
            if (!organizationId) {
              const org = await prisma.$transaction(async (tx) => {
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
                return newOrg
              })
              organizationId = org.id
            }

            // Fetch org role
            const orgMember = await prisma.orgMember.findUnique({
              where: { organizationId_userId: { organizationId: organizationId!, userId: user.id } },
              select: { role: true },
            })
            const orgRole = orgMember?.role ?? undefined

            return {
              id: user.id,
              email: user.email ?? "",
              name: user.name ?? "",
              workspaceId: user.workspaceId,
              organizationId,
              onboarded: user.onboarded,
              orgRole,
            };
          }
        }

        return null;
      }
    })
  ],
})
