-- Website catalog sync (goodchoiceth.com -> GCOffice), replaces the WooCommerce pull.
--
-- NOTE: the two enum values added below must NOT be referenced anywhere else in
-- this file. Postgres forbids using a value added with ALTER TYPE ... ADD VALUE
-- inside the same transaction. Existing WOOCOMMERCE rows are intentionally left
-- as-is; the first full sync flips matched rows to WEBSITE.

-- AlterEnum
ALTER TYPE "ProductSource" ADD VALUE 'WEBSITE';

-- AlterEnum
ALTER TYPE "SyncTrigger" ADD VALUE 'WEBHOOK';

-- DropForeignKey
ALTER TABLE "woocommerce_sync_logs" DROP CONSTRAINT "woocommerce_sync_logs_config_id_fkey";

-- DropTable
DROP TABLE "woocommerce_sync_logs";

-- DropTable
DROP TABLE "woocommerce_configs";

-- AlterTable
ALTER TABLE "product_categories" ADD COLUMN     "website_category_id" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "website_product_id" INTEGER,
ADD COLUMN     "website_slug" TEXT,
ADD COLUMN     "website_specs" JSONB,
ADD COLUMN     "website_updated_at" TIMESTAMP(3),
ADD COLUMN     "last_synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product_color_variants" ADD COLUMN     "sku" TEXT,
ADD COLUMN     "website_variant_id" INTEGER,
ADD COLUMN     "website_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "website_stock_status" TEXT;

-- CreateTable
CREATE TABLE "catalog_sync_logs" (
    "id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "trigger" "SyncTrigger" NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'full',
    "dry_run" BOOLEAN NOT NULL DEFAULT false,
    "total_fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "deactivated" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "details" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "catalog_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_sync_logs_started_at_idx" ON "catalog_sync_logs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_website_category_id_key" ON "product_categories"("website_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_website_product_id_key" ON "products"("website_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_color_variants_website_variant_id_key" ON "product_color_variants"("website_variant_id");
