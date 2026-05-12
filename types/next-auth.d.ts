import NextAuth, { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      workspaceId: string
      organizationId?: string
      onboarded?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    workspaceId: string
    organizationId?: string
    onboarded?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    workspaceId: string
    organizationId?: string
    onboarded?: boolean
  }
}
