-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "clientLogoUrl"      TEXT,
                        ADD COLUMN "clientColor"         TEXT DEFAULT '#2563eb',
                        ADD COLUMN "clientContactName"   TEXT,
                        ADD COLUMN "clientContactEmail"  TEXT,
                        ADD COLUMN "timezone"            TEXT DEFAULT 'America/New_York',
                        ADD COLUMN "currency"            TEXT DEFAULT 'USD',
                        ADD COLUMN "portalEnabled"       BOOLEAN NOT NULL DEFAULT false,
                        ADD COLUMN "portalToken"         TEXT,
                        ADD COLUMN "portalPassword"      TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_portalToken_key" ON "Workspace"("portalToken");
