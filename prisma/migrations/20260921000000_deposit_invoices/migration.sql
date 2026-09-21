-- AlterTable
ALTER TABLE "documents"
  ADD COLUMN "is_deposit_invoice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deposit_percent" DECIMAL(5,2),
  ADD COLUMN "deposit_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "net_payable" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill: every pre-existing document has no deduction, so its net payable
-- equals its grand total.
UPDATE "documents" SET "net_payable" = "grand_total";

-- CreateTable
CREATE TABLE "document_deposit_deductions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "deposit_document_id" TEXT,
    "label" TEXT NOT NULL,
    "tax_invoice_number" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "deposit_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_deposit_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_deposit_deductions_document_id_idx" ON "document_deposit_deductions"("document_id");

-- AddForeignKey
ALTER TABLE "document_deposit_deductions" ADD CONSTRAINT "document_deposit_deductions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_deposit_deductions" ADD CONSTRAINT "document_deposit_deductions_deposit_document_id_fkey" FOREIGN KEY ("deposit_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
