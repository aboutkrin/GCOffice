CREATE TYPE "ReceiptPaymentType" AS ENUM ('FULL', 'DEPOSIT', 'BALANCE');
ALTER TABLE "documents"
  ADD COLUMN "receipt_payment_type" "ReceiptPaymentType",
  ADD COLUMN "receipt_payment_summary" JSONB;
CREATE INDEX "documents_source_invoice_id_idx" ON "documents"("source_invoice_id");
