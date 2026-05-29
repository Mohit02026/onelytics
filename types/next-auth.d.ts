import NextAuth, { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      workspaceId: string
      organizationId?: string
      onboarded?: boolean
      orgRole?: string
    } & DefaultSession["user"]
  }

  // authorize() only returns standard fields; JWT callback reads custom fields from DB
  interface User {
    workspaceId?: string
    organizationId?: string
    onboarded?: boolean
    orgRole?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    workspaceId: string
    organizationId?: string
    onboarded?: boolean
    orgRole?: string
  }
}
