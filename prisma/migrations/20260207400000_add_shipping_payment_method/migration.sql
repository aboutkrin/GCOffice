-- AlterTable
ALTER TABLE "vendor_costs" ADD COLUMN "shipping_payment_method" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER';
