import { notFound } from "next/navigation";

import { getPayrollById } from "@/data/payroll";
import { PayrollSlipRoute } from "@/components/payroll/payroll-slip-route";

export const dynamic = "force-dynamic";

export default async function AdminPayrollSlipPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const payroll = await getPayrollById(id);
  if (!payroll) notFound();

  // Opened from the employee's page under ผู้ใช้งาน → go back there.
  const backHref =
    from === "user" ? `/users/${payroll.profileId}?tab=payslips` : `/payroll/${payroll.id}`;

  return <PayrollSlipRoute payroll={payroll} backHref={backHref} />;
}
