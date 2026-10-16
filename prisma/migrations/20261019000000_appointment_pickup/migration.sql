-- Customer appointments: "รับสินค้าที่โชว์รูม" kind, optionally linked to the quotation being collected
ALTER TYPE "AppointmentKind" ADD VALUE 'PICKUP';
ALTER TABLE "customer_appointments" ADD COLUMN "document_id" TEXT;
ALTER TABLE "customer_appointments" ADD CONSTRAINT "customer_appointments_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "customer_appointments_document_id_idx" ON "customer_appointments"("document_id");
