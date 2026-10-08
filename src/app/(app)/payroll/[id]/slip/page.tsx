import { notFound } from "next/navigation";

import { getPayrollById } from "@/data/payroll";
import { getCompanies } from "@/data/companies";
import { THAI_MONTHS } from "@/lib/thai-date";
import type { PayrollSlipData } from "@/components/payroll/payroll-slip-preview";
import { PayrollSlipPage } from "@/components/payroll/payroll-slip-page";

export const dynamic = "force-dynamic";

export default async function PayrollSlipRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [payroll, companies] = await Promise.all([getPayrollById(id), getCompanies()]);
  if (!payroll) notFound();

  const company = companies[0];

  return (
    <PayrollSlipPage
      data={{
        ...(payroll as unknown as Omit<PayrollSlipData, "email" | "company">),
        email: payroll.profile.email,
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
      backHref={`/payroll/${payroll.id}`}
    />
  );
}
