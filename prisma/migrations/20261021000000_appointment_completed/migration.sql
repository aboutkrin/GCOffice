-- Customer appointments: "รับสินค้าแล้ว / พบลูกค้าแล้ว" — when the appointment happened and who recorded it
ALTER TABLE "customer_appointments" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "customer_appointments" ADD COLUMN "completed_by_id" UUID;
ALTER TABLE "customer_appointments" ADD CONSTRAINT "customer_appointments_completed_by_id_fkey"
  FOREIGN KEY ("completed_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
