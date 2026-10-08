-- AlterEnum
ALTER TYPE "LeaveType" ADD VALUE 'MATERNITY';
ALTER TYPE "LeaveType" ADD VALUE 'PATERNITY';
ALTER TYPE "LeaveType" ADD VALUE 'CHILDCARE';
ALTER TYPE "LeaveType" ADD VALUE 'STERILIZATION';
ALTER TYPE "LeaveType" ADD VALUE 'MILITARY';

-- AlterTable
ALTER TABLE "employee_salaries" ADD COLUMN "annual_leave_days" INTEGER NOT NULL DEFAULT 6;

-- AlterTable
ALTER TABLE "payrolls" ADD COLUMN "unpaid_leave_hours" DECIMAL(8,2) NOT NULL DEFAULT 0;

-- Payslips saved before leave quotas deducted every leave hour
UPDATE "payrolls" SET "unpaid_leave_hours" = "leave_hours";
