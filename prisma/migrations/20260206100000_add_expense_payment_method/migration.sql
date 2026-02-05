-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CREDIT_CARD', 'PROMPTPAY', 'CHECK', 'OTHER');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER';
