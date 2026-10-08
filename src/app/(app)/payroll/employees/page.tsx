import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getEmployeeSalaries } from "@/data/payroll";
import { Button } from "@/components/ui/button";
import { EmployeeSalaryTable } from "@/components/payroll/employee-salary-table";

export const dynamic = "force-dynamic";

export default async function EmployeeSalariesPage() {
  const rows = await getEmployeeSalaries();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/payroll">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">ตั้งค่าเงินเดือนพนักงาน</h1>
          <p className="text-muted-foreground text-sm">
            กรอกเงินเดือนเต็มเดือนและวันเริ่มงานของพนักงานแต่ละคน (พนักงานคือผู้ใช้งานในระบบ)
          </p>
        </div>
      </div>

      <EmployeeSalaryTable rows={rows} />
    </div>
  );
}
