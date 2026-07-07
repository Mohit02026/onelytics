-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "org_invites" DROP CONSTRAINT "org_invites_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "org_members" DROP CONSTRAINT "org_members_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "org_members" DROP CONSTRAINT "org_members_user_id_fkey";

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "weeklyReportEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weeklyReportLastSentAt" TIMESTAMP(3),
ADD COLUMN     "weeklyReportRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "weeklyReportSenderId" TEXT;

-- AlterTable
ALTER TABLE "org_invites" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "org_members" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "connected_mailboxes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email_address" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_mailboxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connected_mailboxes_user_id_idx" ON "connected_mailboxes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "connected_mailboxes_user_id_provider_key" ON "connected_mailboxes"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_mailboxes" ADD CONSTRAINT "connected_mailboxes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
