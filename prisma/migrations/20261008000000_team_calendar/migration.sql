-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'PERSONAL', 'OTHER');
CREATE TYPE "LeavePeriod" AS ENUM ('FULL_DAY', 'MORNING', 'AFTERNOON');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ChinaShipmentStatus" AS ENUM ('SHIPPED', 'ARRIVED_TH', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "period" "LeavePeriod" NOT NULL DEFAULT 'FULL_DAY',
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "china_shipments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "container_no" TEXT,
    "supplier" TEXT,
    "shipped_date" DATE NOT NULL,
    "eta_date" DATE,
    "arrived_date" DATE,
    "received_date" DATE,
    "status" "ChinaShipmentStatus" NOT NULL DEFAULT 'SHIPPED',
    "note" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "china_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_requests_start_date_end_date_idx" ON "leave_requests"("start_date", "end_date");
CREATE INDEX "leave_requests_profile_id_status_idx" ON "leave_requests"("profile_id", "status");
CREATE INDEX "china_shipments_shipped_date_idx" ON "china_shipments"("shipped_date");
CREATE INDEX "china_shipments_eta_date_idx" ON "china_shipments"("eta_date");
CREATE INDEX "china_shipments_status_idx" ON "china_shipments"("status");

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "china_shipments" ADD CONSTRAINT "china_shipments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
