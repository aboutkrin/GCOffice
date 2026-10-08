import { getCompanies } from "@/data/companies";
import { getLeaveBalancesAsOf } from "@/data/leave-balances";
import type { getPayrollById } from "@/data/payroll";
import { THAI_MONTHS } from "@/lib/thai-date";
import type { PayrollSlipData } from "@/components/payroll/payroll-slip-preview";
import { PayrollSlipPage } from "@/components/payroll/payroll-slip-page";

type SavedPayroll = NonNullable<Awaited<ReturnType<typeof getPayrollById>>>;

/** Printable payslip with the company header and the year's leave balance (admin + employee routes). */
export async function PayrollSlipRoute({ payroll, backHref }: { payroll: SavedPayroll; backHref: string }) {
  const [companies, leaveBalances] = await Promise.all([
    getCompanies(),
    getLeaveBalancesAsOf(payroll.profileId, payroll.year, payroll.month),
  ]);
  const company = companies[0];

  return (
    <PayrollSlipPage
      data={{
        ...(payroll as unknown as Omit<PayrollSlipData, "email" | "company">),
        email: payroll.profile.email,
        leaveBalances,
        company: company
          ? {
              name: company.name,
              address: company.address,
              logoUrl: company.logoUrl,
              phone: company.phone,
            }
          : undefined,
      }}
      filename={`สลิปเงินเดือน-${payroll.employeeName}-${THAI_MONTHS[payroll.month - 1]}-${payroll.year + 543}`}
      backHref={backHref}
    />
  );
}
