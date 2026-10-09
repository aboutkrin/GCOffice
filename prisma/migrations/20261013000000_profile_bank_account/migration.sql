-- Employee's own bank account for salary transfer, printed on payslips
ALTER TABLE "profiles" ADD COLUMN "bank_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN "bank_account_name" TEXT;
ALTER TABLE "profiles" ADD COLUMN "bank_account_number" TEXT;
