-- AlterTable: add nullable customer_code column first
ALTER TABLE "customers" ADD COLUMN "customer_code" TEXT;

-- Backfill existing customers with sequential codes (ordered by created_at)
UPDATE "customers"
SET "customer_code" = 'CUS-' || LPAD(sub.row_num::TEXT, 4, '0')
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "created_at" ASC) AS row_num
  FROM "customers"
) sub
WHERE "customers"."id" = sub.id;

-- Now make it NOT NULL and add UNIQUE constraint
ALTER TABLE "customers" ALTER COLUMN "customer_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");
