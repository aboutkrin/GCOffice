-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('MANUAL', 'WOOCOMMERCE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('MANUAL', 'SCHEDULED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "source" "ProductSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "woocommerce_id" INTEGER;

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE INDEX "woocommerce_sync_logs_config_id_idx" ON "woocommerce_sync_logs"("config_id");

-- CreateIndex
CREATE INDEX "woocommerce_sync_logs_started_at_idx" ON "woocommerce_sync_logs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "products_woocommerce_id_key" ON "products"("woocommerce_id");

-- AddForeignKey
ALTER TABLE "woocommerce_sync_logs" ADD CONSTRAINT "woocommerce_sync_logs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "woocommerce_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
