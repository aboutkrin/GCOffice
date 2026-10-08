import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getPayrollById } from "@/data/payroll";
import { THAI_MONTHS } from "@/lib/thai-date";
import { Button } from "@/components/ui/button";
import { PayrollEditor, type PayrollEditorData } from "@/components/payroll/payroll-editor";

export const dynamic = "force-dynamic";

export default async function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payroll = await getPayrollById(id);
  if (!payroll) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/payroll?year=${payroll.year}&month=${payroll.month}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">สลิปเงินเดือน — {payroll.employeeName}</h1>
          <p className="text-muted-foreground text-sm">
            ประจำเดือน {THAI_MONTHS[payroll.month - 1]} พ.ศ. {payroll.year + 543}
          </p>
        </div>
      </div>

      <PayrollEditor
        key={payroll.updatedAt as unknown as string}
        data={payroll as unknown as PayrollEditorData}
      />
    </div>
  );
}
