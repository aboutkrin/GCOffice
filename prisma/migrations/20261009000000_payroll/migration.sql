-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'CONFIRMED');
CREATE TYPE "PayrollItemKind" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateTable
CREATE TABLE "employee_salaries" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "monthly_salary" DECIMAL(12,2) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_salaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payrolls" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "employee_name" TEXT NOT NULL,
    "monthly_salary" DECIMAL(12,2) NOT NULL,
    "daily_rate" DECIMAL(12,4) NOT NULL,
    "hourly_rate" DECIMAL(12,4) NOT NULL,
    "paid_days" INTEGER NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "leave_hours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "leave_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "leave_details" JSONB NOT NULL DEFAULT '[]',
    "total_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmed_at" TIMESTAMP(3),
    "expense_id" TEXT,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL,
    "payroll_id" TEXT NOT NULL,
    "kind" "PayrollItemKind" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_salaries_profile_id_key" ON "employee_salaries"("profile_id");
CREATE UNIQUE INDEX "payrolls_expense_id_key" ON "payrolls"("expense_id");
CREATE UNIQUE INDEX "payrolls_profile_id_year_month_key" ON "payrolls"("profile_id", "year", "month");
CREATE INDEX "payrolls_year_month_idx" ON "payrolls"("year", "month");
CREATE INDEX "payroll_items_payroll_id_idx" ON "payroll_items"("payroll_id");

-- AddForeignKey
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
