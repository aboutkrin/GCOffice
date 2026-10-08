import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { getPayrollMonth } from "@/data/payroll";
import { getThaiNow } from "@/lib/thai-date";
import { Button } from "@/components/ui/button";
import { PayrollMonthTable } from "@/components/payroll/payroll-month-table";

export const dynamic = "force-dynamic";

interface PayrollPageProps {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const params = await searchParams;
  const thaiNow = getThaiNow();
  const year = parseInt(params.year ?? "", 10) || thaiNow.year;
  const monthParam = parseInt(params.month ?? "", 10);
  const month = monthParam >= 1 && monthParam <= 12 ? monthParam : thaiNow.month;

  const rows = await getPayrollMonth(year, month);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">เงินเดือนพนักงาน</h1>
          <p className="text-muted-foreground text-sm">
            คำนวณเงินเดือนรายเดือน หักเฉพาะวันลาที่เกินสิทธิ์ และพิมพ์สลิปเงินเดือนให้พนักงาน
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/payroll/leave?year=${year}`}>
            <CalendarCheck className="size-4" />
            สรุปวันลาพนักงาน
          </Link>
        </Button>
      </div>

      <PayrollMonthTable rows={rows} year={year} month={month} currentYear={thaiNow.year} />
    </div>
  );
}
