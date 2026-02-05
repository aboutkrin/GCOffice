-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'RECEIPT';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "source_invoice_id" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_invoice_id_fkey" FOREIGN KEY ("source_invoice_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
