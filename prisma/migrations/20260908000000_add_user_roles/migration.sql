-- Add role-based authorization (ADMIN / STAFF) and per-record "created by" audit trail.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'STAFF';
ALTER TABLE "profiles" ADD COLUMN "status" "Status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "vendor_costs" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "vendor_costs" ADD CONSTRAINT "vendor_costs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every existing account becomes ADMIN so nobody is locked out of the new users page.
-- The owner can then demote staff accounts from the /users page.
UPDATE "profiles" SET "role" = 'ADMIN';
