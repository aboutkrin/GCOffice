"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calculator, FileText, Loader2, Pencil, Plus, Settings2 } from "lucide-react";

import { createPayroll, generatePayrollMonth } from "@/actions/payroll-actions";
import type { PayrollMonthRow } from "@/data/payroll";
import { formatBaht } from "@/lib/thai-currency";
import { THAI_MONTHS } from "@/lib/thai-date";
import { PAYROLL_STATUS_COLORS, PAYROLL_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PayrollMonthTableProps {
  rows: PayrollMonthRow[];
  year: number;
  month: number;
  currentYear: number;
}

function rowFigures(row: PayrollMonthRow) {
  if (row.payroll) return row.payroll;
  const p = row.preview!;
  return {
    monthlySalary: p.monthlySalary,
    paidDays: p.paidDays,
    baseAmount: p.baseAmount,
    leaveHours: p.leaveHours,
    unpaidLeaveHours: p.unpaidLeaveHours,
    leaveDeduction: p.leaveDeduction,
    totalEarnings: p.totalEarnings,
    totalDeductions: p.totalDeductions,
    netPay: p.netPay,
  };
}

export function PayrollMonthTable({ rows, year, month, currentYear }: PayrollMonthTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);
  const total = rows.reduce((sum, r) => sum + rowFigures(r).netPay, 0);
  const unsaved = rows.filter((r) => !r.payroll).length;

  function go(nextYear: number, nextMonth: number) {
    router.push(`/payroll?year=${nextYear}&month=${nextMonth}`);
  }

  function handleGenerate() {
    startTransition(async () => {
      const res = await generatePayrollMonth(year, month);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`คำนวณสลิปเงินเดือน ${res.count ?? 0} รายการแล้ว`);
      router.refresh();
    });
  }

  function handleCreate(profileId: string) {
    startTransition(async () => {
      const res = await createPayroll(profileId, year, month);
      if (res.error || !res.id) {
        toast.error(res.error ?? "สร้างสลิปไม่สำเร็จ");
        return;
      }
      router.push(`/payroll/${res.id}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={(v) => go(year, Number(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THAI_MONTHS.map((name, i) => (
                <SelectItem key={name} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => go(Number(v), month)}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y + 543}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/payroll/employees">
              <Settings2 className="size-4" />
              ตั้งค่าเงินเดือนพนักงาน
            </Link>
          </Button>
          <Button onClick={handleGenerate} disabled={isPending || rows.length === 0}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
            {unsaved > 0 ? "สร้างสลิปทั้งเดือน" : "คำนวณใหม่ทั้งเดือน"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>พนักงาน</TableHead>
              <TableHead className="text-right">เงินเดือน</TableHead>
              <TableHead className="text-center">วันที่คิด</TableHead>
              <TableHead className="text-right">หักลา</TableHead>
              <TableHead className="text-right">รายได้อื่น</TableHead>
              <TableHead className="text-right">หักอื่น</TableHead>
              <TableHead className="text-right">รับสุทธิ</TableHead>
              <TableHead className="text-center">สถานะ</TableHead>
              <TableHead className="w-[1%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  ยังไม่มีพนักงานที่ตั้งค่าเงินเดือนสำหรับเดือนนี้ —{" "}
                  <Link href="/payroll/employees" className="underline">
                    ตั้งค่าเงินเดือนพนักงาน
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const f = rowFigures(row);
                return (
                  <TableRow key={row.profileId}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      {row.username && row.username !== row.name && (
                        <div className="text-xs text-muted-foreground">{row.username}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatBaht(f.monthlySalary)}</TableCell>
                    <TableCell className="text-center">{f.paidDays} / 30</TableCell>
                    <TableCell className="text-right text-red-600">
                      {f.leaveDeduction > 0 ? (
                        <>
                          -{formatBaht(f.leaveDeduction)}
                          <div className="text-xs text-muted-foreground">{f.unpaidLeaveHours} ชม.</div>
                        </>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right text-green-700">
                      {f.totalEarnings > 0 ? `+${formatBaht(f.totalEarnings)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {f.totalDeductions > 0 ? `-${formatBaht(f.totalDeductions)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatBaht(f.netPay)}</TableCell>
                    <TableCell className="text-center">
                      {row.payroll ? (
                        <Badge className={cn("border-0", PAYROLL_STATUS_COLORS[row.payroll.status])}>
                          {PAYROLL_STATUS_LABELS[row.payroll.status]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">ยังไม่สร้างสลิป</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {row.payroll ? (
                          <>
                            <Button variant="ghost" size="icon" asChild title="แก้ไข / ดูรายละเอียด">
                              <Link href={`/payroll/${row.payroll.id}`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild title="พิมพ์สลิปเงินเดือน">
                              <Link href={`/payroll/${row.payroll.id}/slip`}>
                                <FileText className="size-4" />
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleCreate(row.profileId)}
                          >
                            <Plus className="size-4" />
                            สร้างสลิป
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="text-right font-semibold">
                  รวมเงินเดือนที่ต้องจ่าย {THAI_MONTHS[month - 1]} {year + 543}
                </TableCell>
                <TableCell className="text-right font-bold">{formatBaht(total)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        คิดเงินเดือนแบบ 30 วันทุกเดือน (ค่าแรงรายวัน = เงินเดือน ÷ 30, ไม่หักวันอาทิตย์) ·
        เดือนที่เริ่มงาน/ลาออกกลางเดือนคิดตามจำนวนวันที่ทำงานจริง ·
        หักการลาที่อนุมัติแล้วทุกประเภทตามชั่วโมง (9:00–18:00 = 8 ชม., ลาเช้า 3 ชม., ลาบ่าย 5 ชม.) ·
        เมื่อกด &quot;ยืนยัน&quot; ในสลิป ยอดรับสุทธิจะถูกบันทึกเป็นค่าใช้จ่ายหมวด &quot;เงินเดือนพนักงาน&quot; อัตโนมัติ
      </p>
    </div>
  );
}
