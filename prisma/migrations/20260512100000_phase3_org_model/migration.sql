-- Phase 3: Organization model, org members, org invites, user profile fields

DO $$ BEGIN
  CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "organizations" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"       TEXT NOT NULL,
  "logo_url"   TEXT,
  "color"      TEXT DEFAULT '#2563eb',
  "domain"     TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_members" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id" TEXT NOT NULL,
  "user_id"         TEXT NOT NULL,
  "role"            "OrgRole" NOT NULL DEFAULT 'MEMBER',
  "joined_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_invites" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organization_id" TEXT NOT NULL,
  "email"           TEXT NOT NULL,
  "role"            "OrgRole" NOT NULL DEFAULT 'MEMBER',
  "token"           TEXT NOT NULL,
  "invited_by_id"   TEXT,
  "expires_at"      TIMESTAMP(3) NOT NULL,
  "accepted_at"     TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_invites_pkey" PRIMARY KEY ("id")
);

-- Add organization FK to Workspace
ALTER TABLE "Workspace" ADD COLUMN "organization_id" TEXT;

-- Add new user profile fields
ALTER TABLE "User"
  ADD COLUMN "organization_id" TEXT,
  ADD COLUMN "phone"           TEXT,
  ADD COLUMN "job_title"       TEXT,
  ADD COLUMN "avatar_url"      TEXT,
  ADD COLUMN "timezone"        TEXT DEFAULT 'America/New_York',
  ADD COLUMN "onboarded"       BOOLEAN NOT NULL DEFAULT false;

-- Foreign keys
ALTER TABLE "org_members"
  ADD CONSTRAINT "org_members_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "org_members"
  ADD CONSTRAINT "org_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "org_invites"
  ADD CONSTRAINT "org_invites_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

ALTER TABLE "Workspace"
  ADD CONSTRAINT "Workspace_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");

-- Indexes
CREATE UNIQUE INDEX "org_members_organization_id_user_id_key" ON "org_members"("organization_id", "user_id");
CREATE INDEX "org_members_organization_id_idx" ON "org_members"("organization_id");
CREATE INDEX "org_members_user_id_idx" ON "org_members"("user_id");
CREATE UNIQUE INDEX "org_invites_token_key" ON "org_invites"("token");
CREATE INDEX "org_invites_organization_id_idx" ON "org_invites"("organization_id");
CREATE INDEX "org_invites_token_idx" ON "org_invites"("token");
CREATE INDEX "User_organization_id_idx" ON "User"("organization_id");
