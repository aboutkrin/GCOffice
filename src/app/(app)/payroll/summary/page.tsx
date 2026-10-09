import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, FileClock } from "lucide-react";

import { getPayrollYearSummary, type PayrollYearCell } from "@/data/payroll";
import { getThaiNow, THAI_MONTHS, THAI_MONTHS_SHORT } from "@/lib/thai-date";
import { formatBaht } from "@/lib/thai-currency";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { YearSwitcher } from "@/components/leave/year-switcher";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

interface PayrollSummaryPageProps {
  searchParams: Promise<{ year?: string }>;
}

/** Whole baht without the ฿ sign, so 12 month columns still fit. */
function compactBaht(n: number) {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function MonthCell({ cell, year, month }: { cell: PayrollYearCell; year: number; month: number }) {
  if (cell.kind === "none") {
    return <span className="text-muted-foreground/40">·</span>;
  }
  if (cell.kind === "missing") {
    return (
      <Link
        href={`/payroll?year=${year}&month=${month}`}
        className="inline-flex flex-col items-center rounded-md border border-dashed border-muted-foreground/40 px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        title={`ยังไม่สร้างสลิป ${THAI_MONTHS[month - 1]} — กดเพื่อไปสร้าง`}
      >
        <CircleDashed className="size-3.5" />
        ยังไม่ทำ
      </Link>
    );
  }
  const confirmed = cell.status === "CONFIRMED";
  return (
    <Link
      href={confirmed ? `/payroll/${cell.id}/slip?from=summary` : `/payroll/${cell.id}`}
      className={cn(
        "inline-flex flex-col items-center rounded-md px-2 py-1 text-xs font-medium tabular-nums",
        confirmed
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-amber-100 text-amber-800 hover:bg-amber-200"
      )}
      title={`${confirmed ? "จ่ายแล้ว (ยืนยันสลิป)" : "ฉบับร่าง — ยังไม่ยืนยัน"} ${formatBaht(cell.netPay)}`}
    >
      {confirmed ? <CheckCircle2 className="size-3.5" /> : <FileClock className="size-3.5" />}
      {compactBaht(cell.netPay)}
    </Link>
  );
}

export default async function PayrollSummaryPage({ searchParams }: PayrollSummaryPageProps) {
  const params = await searchParams;
  const now = getThaiNow();
  const year = parseInt(params.year ?? "", 10) || now.year;
  const rows = await getPayrollYearSummary(year, now);

  const totalPaid = rows.reduce((s, r) => s + r.confirmedTotal, 0);
  const paidSlips = rows.reduce((s, r) => s + r.confirmedCount, 0);
  const draftSlips = rows.reduce((s, r) => s + r.draftCount, 0);
  const missingSlips = rows.reduce((s, r) => s + r.missingCount, 0);
  const monthTotals = Array.from({ length: 12 }, (_, i) =>
    rows.reduce((s, r) => {
      const c = r.months[i];
      return c.kind === "slip" && c.status === "CONFIRMED" ? s + c.netPay : s;
    }, 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/payroll" aria-label="กลับ">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">สรุปเงินเดือนพนักงาน</h1>
            <p className="text-muted-foreground text-sm">
              ดูว่าจ่ายเงินเดือนใครไปแล้วเดือนไหนบ้าง · กดช่องเพื่อเปิดสลิปหรือไปสร้างสลิปของเดือนนั้น
            </p>
          </div>
        </div>
        <YearSwitcher year={year} hrefFor={(y) => `/payroll/summary?year=${y}`} />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">จ่ายแล้วทั้งปี {year + 543}</p>
          <p className="text-2xl font-bold tabular-nums">{formatBaht(totalPaid)}</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">สลิปที่จ่ายแล้ว</p>
          <p className="text-2xl font-bold text-green-700">{paidSlips} ใบ</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">ฉบับร่าง (ยังไม่ยืนยัน)</p>
          <p className={cn("text-2xl font-bold", draftSlips > 0 && "text-amber-700")}>{draftSlips} ใบ</p>
        </div>
        <div className="rounded-md border p-4">
          <p className="text-sm text-muted-foreground">ค้างยังไม่ทำสลิป</p>
          <p className={cn("text-2xl font-bold", missingSlips > 0 && "text-red-600")}>{missingSlips} เดือน</p>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-background">พนักงาน</TableHead>
              {THAI_MONTHS_SHORT.map((m, i) => (
                <TableHead
                  key={m}
                  className={cn(
                    "text-center whitespace-nowrap",
                    year === now.year && i + 1 === now.month && "text-foreground font-semibold"
                  )}
                >
                  <Link href={`/payroll?year=${year}&month=${i + 1}`} className="hover:underline">
                    {m}
                  </Link>
                </TableHead>
              ))}
              <TableHead className="text-right whitespace-nowrap">รวมจ่ายแล้ว</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="py-8 text-center text-muted-foreground">
                  ไม่มีข้อมูลเงินเดือนในปีนี้
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.profileId}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium whitespace-nowrap">
                    {row.name}
                    {row.username && (
                      <div className="text-xs font-normal text-muted-foreground">{row.username}</div>
                    )}
                  </TableCell>
                  {row.months.map((cell, i) => (
                    <TableCell key={i} className="px-1 text-center">
                      <MonthCell cell={cell} year={year} month={i + 1} />
                    </TableCell>
                  ))}
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="font-semibold tabular-nums">{formatBaht(row.confirmedTotal)}</div>
                    <div className="text-xs text-muted-foreground">{row.confirmedCount} เดือน</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="sticky left-0 z-10 bg-muted font-semibold whitespace-nowrap">
                  รวมจ่ายแล้ว
                </TableCell>
                {monthTotals.map((t, i) => (
                  <TableCell key={i} className="px-1 text-center text-xs font-medium tabular-nums">
                    {t > 0 ? compactBaht(t) : "-"}
                  </TableCell>
                ))}
                <TableCell className="text-right font-bold tabular-nums whitespace-nowrap">
                  {formatBaht(totalPaid)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-green-700" /> จ่ายแล้ว (ยืนยันสลิป และบันทึกเป็นค่าใช้จ่ายแล้ว)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileClock className="size-3.5 text-amber-700" /> ฉบับร่าง — ยังไม่ได้ยืนยัน
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CircleDashed className="size-3.5" /> ยังไม่ได้สร้างสลิปของเดือนนั้น
        </span>
        <span>· = ยังไม่เริ่มงาน / ลาออกแล้ว / ยังไม่ถึงเดือน</span>
      </div>
    </div>
  );
}
