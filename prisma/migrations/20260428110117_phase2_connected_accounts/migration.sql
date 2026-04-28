-- CreateTable
CREATE TABLE "connected_accounts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "property_id" TEXT,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_cache" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "date_range" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "connected_accounts_workspace_id_idx" ON "connected_accounts"("workspace_id");

-- CreateIndex
CREATE INDEX "connected_accounts_workspace_id_provider_idx" ON "connected_accounts"("workspace_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_workspace_id_provider_key" ON "connected_accounts"("workspace_id", "provider");

-- CreateIndex
CREATE INDEX "analytics_cache_workspace_id_idx" ON "analytics_cache"("workspace_id");

-- CreateIndex
CREATE INDEX "analytics_cache_workspace_id_provider_idx" ON "analytics_cache"("workspace_id", "provider");

-- CreateIndex
CREATE INDEX "analytics_cache_fetched_at_idx" ON "analytics_cache"("fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_cache_workspace_id_provider_data_type_date_range_key" ON "analytics_cache"("workspace_id", "provider", "data_type", "date_range");

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_cache" ADD CONSTRAINT "analytics_cache_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
