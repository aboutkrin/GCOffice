-- Customer appointments ("นัดพบลูกค้า") on the team calendar
-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "customer_appointments" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "customer_id" TEXT,
    "location" TEXT,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT,
    "note" TEXT,
    "attendee_id" UUID NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_appointments_date_idx" ON "customer_appointments"("date");
CREATE INDEX "customer_appointments_attendee_id_status_idx" ON "customer_appointments"("attendee_id", "status");

-- AddForeignKey
ALTER TABLE "customer_appointments" ADD CONSTRAINT "customer_appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_appointments" ADD CONSTRAINT "customer_appointments_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_appointments" ADD CONSTRAINT "customer_appointments_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_appointments" ADD CONSTRAINT "customer_appointments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
