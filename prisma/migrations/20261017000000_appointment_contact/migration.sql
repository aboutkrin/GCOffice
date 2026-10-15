-- Customer appointments: Google Maps link, contact person and phone
ALTER TABLE "customer_appointments" ADD COLUMN "map_url" TEXT;
ALTER TABLE "customer_appointments" ADD COLUMN "contact_name" TEXT;
ALTER TABLE "customer_appointments" ADD COLUMN "contact_phone" TEXT;
