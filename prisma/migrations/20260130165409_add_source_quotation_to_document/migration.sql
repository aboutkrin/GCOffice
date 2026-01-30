-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "source_quotation_id" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_quotation_id_fkey" FOREIGN KEY ("source_quotation_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
