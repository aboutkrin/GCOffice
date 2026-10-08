-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('COMPANY', 'PUBLIC');

-- AlterTable: existing holidays keep behaving as office-closed days
ALTER TABLE "holidays" ADD COLUMN "type" "HolidayType" NOT NULL DEFAULT 'COMPANY';
