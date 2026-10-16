-- Invoices issued off a quotation as FULL / DEPOSIT / BALANCE (same enum as receipts)
-- and the channel the customer actually paid through.
ALTER TABLE "documents"
  ADD COLUMN "invoice_billing_type" "ReceiptPaymentType",
  ADD COLUMN "invoice_billing_summary" JSONB,
  ADD COLUMN "payment_method" "PaymentMethod",
  ADD COLUMN "payment_reference" TEXT;
CREATE INDEX "documents_source_quotation_id_idx" ON "documents"("source_quotation_id");
