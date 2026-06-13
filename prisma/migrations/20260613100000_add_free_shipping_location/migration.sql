-- AlterTable
ALTER TABLE "documents" ADD COLUMN "free_shipping" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "free_shipping_location" TEXT;
