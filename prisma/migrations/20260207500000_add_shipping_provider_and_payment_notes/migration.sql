-- AlterTable
ALTER TABLE "vendor_costs" ADD COLUMN "shipping_provider" TEXT NOT NULL DEFAULT 'UNEED_CARGO';
ALTER TABLE "vendor_costs" ADD COLUMN "payment_method_note" TEXT;
ALTER TABLE "vendor_costs" ADD COLUMN "shipping_payment_method_note" TEXT;
