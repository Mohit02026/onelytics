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
          const { email, password } = parsedCredentials.data;
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.password) return null;
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) {
            // Fetch org role so we can gate agency views
            let orgRole: string | undefined
            if (user.organizationId) {
              const orgMember = await prisma.orgMember.findUnique({
                where: { organizationId_userId: { organizationId: user.organizationId, userId: user.id } },
                select: { role: true },
              })
              orgRole = orgMember?.role ?? undefined
            }
            return {
              id: user.id,
              email: user.email ?? "",
              name: user.name ?? "",
              workspaceId: user.workspaceId,
              organizationId: user.organizationId ?? undefined,
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
