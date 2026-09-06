-- REFERENCE ONLY. Prisma Migrate does not run this file. Rolling back the
-- 20260905000000_website_catalog_sync migration means redeploying the previous
-- commit AND restoring the database backup taken before the migration: the
-- forward migration drops woocommerce_configs / woocommerce_sync_logs, whose
-- data cannot be recreated by the statements below.
--
-- Postgres cannot remove a value from an enum, so 'WEBSITE' and 'WEBHOOK' stay.

DROP INDEX IF EXISTS "product_color_variants_website_variant_id_key";
DROP INDEX IF EXISTS "products_website_product_id_key";
DROP INDEX IF EXISTS "product_categories_website_category_id_key";
DROP INDEX IF EXISTS "catalog_sync_logs_started_at_idx";

DROP TABLE IF EXISTS "catalog_sync_logs";

ALTER TABLE "product_color_variants"
  DROP COLUMN IF EXISTS "website_stock_status",
  DROP COLUMN IF EXISTS "website_active",
  DROP COLUMN IF EXISTS "website_variant_id",
  DROP COLUMN IF EXISTS "sku";

ALTER TABLE "products"
  DROP COLUMN IF EXISTS "last_synced_at",
  DROP COLUMN IF EXISTS "website_updated_at",
  DROP COLUMN IF EXISTS "website_specs",
  DROP COLUMN IF EXISTS "website_slug",
  DROP COLUMN IF EXISTS "website_product_id";

ALTER TABLE "product_categories" DROP COLUMN IF EXISTS "website_category_id";

-- Recreate the dropped WooCommerce tables (empty) so the previous Prisma client boots.
CREATE TABLE "woocommerce_configs" (
    "id" TEXT NOT NULL,
    "store_url" TEXT NOT NULL,
    "consumer_key" TEXT NOT NULL,
    "consumer_secret" TEXT NOT NULL,
    "auto_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "woocommerce_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "woocommerce_sync_logs" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "trigger" "SyncTrigger" NOT NULL,
    "total_fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "woocommerce_sync_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "woocommerce_sync_logs_config_id_idx" ON "woocommerce_sync_logs"("config_id");
CREATE INDEX "woocommerce_sync_logs_started_at_idx" ON "woocommerce_sync_logs"("started_at");
ALTER TABLE "woocommerce_sync_logs" ADD CONSTRAINT "woocommerce_sync_logs_config_id_fkey"
  FOREIGN KEY ("config_id") REFERENCES "woocommerce_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
