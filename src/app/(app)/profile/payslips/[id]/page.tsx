import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getPayrollById } from "@/data/payroll";
import { PayrollSlipRoute } from "@/components/payroll/payroll-slip-route";

export const dynamic = "force-dynamic";

/** Employees can open only their own CONFIRMED payslips. */
export default async function MyPayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const payroll = await getPayrollById(id);
  if (!payroll || payroll.profileId !== user.id || payroll.status !== "CONFIRMED") notFound();

  return <PayrollSlipRoute payroll={payroll} backHref="/profile?tab=payslips" />;
}
