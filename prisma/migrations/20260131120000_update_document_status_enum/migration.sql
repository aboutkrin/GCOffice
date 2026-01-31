-- Remove SENT from the enum by recreating it with new values
-- Step 1: Create new enum with all desired values (without SENT)
CREATE TYPE "DocumentStatus_new" AS ENUM ('DRAFT', 'QUOTED', 'CONFIRMED', 'SAMPLE', 'BILLED', 'PAID', 'CANCELLED');

-- Step 2: Drop the default so the column can be retyped
ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT;

-- Step 3: Alter column to use new enum
-- Map old SENT values: Quotations -> QUOTED, Invoices -> BILLED, fallback -> DRAFT
ALTER TABLE "documents" ALTER COLUMN "status" TYPE "DocumentStatus_new"
  USING (
    CASE
      WHEN "status"::text = 'SENT' AND "type"::text = 'QUOTATION' THEN 'QUOTED'::"DocumentStatus_new"
      WHEN "status"::text = 'SENT' AND "type"::text = 'INVOICE' THEN 'BILLED'::"DocumentStatus_new"
      WHEN "status"::text = 'SENT' THEN 'DRAFT'::"DocumentStatus_new"
      ELSE "status"::text::"DocumentStatus_new"
    END
  );

-- Step 4: Drop old enum and rename new one
DROP TYPE "DocumentStatus";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";

-- Step 5: Restore the default
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"DocumentStatus";
