import { getCompanies } from "@/data/companies";
import type { getPayrollById } from "@/data/payroll";
import { THAI_MONTHS } from "@/lib/thai-date";
import type { PayrollSlipData } from "@/components/payroll/payroll-slip-preview";
import { PayrollSlipPage } from "@/components/payroll/payroll-slip-page";

type SavedPayroll = NonNullable<Awaited<ReturnType<typeof getPayrollById>>>;

/** Printable payslip with the company header (admin + employee routes). */
export async function PayrollSlipRoute({ payroll, backHref }: { payroll: SavedPayroll; backHref: string }) {
  const companies = await getCompanies();
  const company = companies[0];

  return (
    <PayrollSlipPage
      data={{
        ...(payroll as unknown as Omit<PayrollSlipData, "bankAccount" | "company">),
        // serialize() leaves Prisma Decimals as strings (Decimal.toJSON runs first),
        // so "12000" + "0" would concatenate to 120000 — convert them to numbers.
        monthlySalary: Number(payroll.monthlySalary),
        dailyRate: Number(payroll.dailyRate),
        hourlyRate: Number(payroll.hourlyRate),
        baseAmount: Number(payroll.baseAmount),
        leaveHours: Number(payroll.leaveHours),
        unpaidLeaveHours: Number(payroll.unpaidLeaveHours),
        leaveDeduction: Number(payroll.leaveDeduction),
        totalEarnings: Number(payroll.totalEarnings),
        totalDeductions: Number(payroll.totalDeductions),
        netPay: Number(payroll.netPay),
        items: payroll.items.map((i) => ({ kind: i.kind, name: i.name, amount: Number(i.amount) })),
        bankAccount: {
          bankName: payroll.profile.bankName,
          accountName: payroll.profile.bankAccountName,
          accountNumber: payroll.profile.bankAccountNumber,
        },
        company: company
          ? {
              name: company.name,
              address: company.address,
              logoUrl: company.logoUrl,
              phone: company.phone,
              taxId: company.taxId,
            }
          : undefined,
      }}
      filename={`สลิปเงินเดือน-${payroll.employeeName}-${THAI_MONTHS[payroll.month - 1]}-${payroll.year + 543}`}
      backHref={backHref}
    />
  );
}
