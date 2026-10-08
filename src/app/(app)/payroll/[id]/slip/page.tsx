import { notFound } from "next/navigation";

import { getPayrollById } from "@/data/payroll";
import { PayrollSlipRoute } from "@/components/payroll/payroll-slip-route";

export const dynamic = "force-dynamic";

export default async function AdminPayrollSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payroll = await getPayrollById(id);
  if (!payroll) notFound();

  return <PayrollSlipRoute payroll={payroll} backHref={`/payroll/${payroll.id}`} />;
}
