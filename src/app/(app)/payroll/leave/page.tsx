import { getTeamLeaveBalances } from "@/data/leave-balances";
import { getThaiNow, formatThaiDate } from "@/lib/thai-date";
import { formatLeaveHours } from "@/lib/leave-policy";
import { LEAVE_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { visibleLeaveTypes } from "@/components/leave/leave-balance-cards";
import { YearSwitcher } from "@/components/leave/year-switcher";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

interface LeaveSummaryPageProps {
  searchParams: Promise<{ year?: string }>;
}

export default async function LeaveSummaryPage({ searchParams }: LeaveSummaryPageProps) {
  const params = await searchParams;
  const year = parseInt(params.year ?? "", 10) || getThaiNow().year;
  const rows = await getTeamLeaveBalances(year);
  const types = visibleLeaveTypes(rows.map((r) => r.summary));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">สรุปวันลาพนักงาน</h1>
          <p className="text-muted-foreground text-sm">
            ใช้ไป / สิทธิ์ต่อปี และคงเหลือ ของการลาที่อนุมัติแล้ว · ส่วนที่เกินสิทธิ์จะถูกหักในสลิปเงินเดือน
          </p>
        </div>
        <YearSwitcher year={year} hrefFor={(y) => `/payroll/leave?year=${y}`} />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>พนักงาน</TableHead>
              {types.map((t) => (
                <TableHead key={t} className="text-right whitespace-nowrap">
                  {LEAVE_TYPE_LABELS[t] ?? t}
                </TableHead>
              ))}
              <TableHead className="text-right whitespace-nowrap">หักเงิน (เกินสิทธิ์)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={types.length + 2} className="py-8 text-center text-muted-foreground">
                  ไม่มีพนักงาน
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const unpaid = types.reduce((sum, t) => sum + row.summary.balances[t].unpaidHours, 0);
                return (
                  <TableRow key={row.profileId}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {row.name}
                      {row.summary.annualEligibleFrom && (
                        <div className="text-xs font-normal text-muted-foreground">
                          พักร้อนได้สิทธิ์ {formatThaiDate(new Date(row.summary.annualEligibleFrom), "short")}
                        </div>
                      )}
                    </TableCell>
                    {types.map((t) => {
                      const b = row.summary.balances[t];
                      const pending = row.summary.pendingHours[t];
                      const limit = b.quotaHours ?? b.paidQuotaHours;
                      return (
                        <TableCell key={t} className="text-right whitespace-nowrap">
                          <div className={cn(b.unpaidHours > 0 && "text-red-600 font-medium")}>
                            {formatLeaveHours(b.usedHours)}
                            {limit !== null && (
                              <span className="text-muted-foreground"> / {formatLeaveHours(limit)}</span>
                            )}
                          </div>
                          {b.remainingHours !== null && (
                            <div className="text-xs text-muted-foreground">
                              เหลือ {formatLeaveHours(b.remainingHours)}
                            </div>
                          )}
                          {pending > 0 && (
                            <div className="text-xs text-amber-600">รอ {formatLeaveHours(pending)}</div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right whitespace-nowrap">
                      {unpaid > 0 ? (
                        <span className="text-red-600">{formatLeaveHours(unpaid)}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">สิทธิ์วันลาตาม พ.ร.บ.คุ้มครองแรงงาน (ค่าเริ่มต้นของระบบ)</p>
        <p>ลาป่วย 30 วันทำงาน/ปี · ลากิจ 3 วัน · ลาพักร้อนตามที่ตั้งไว้รายคน (ขั้นต่ำ 6 วัน เมื่อทำงานครบ 1 ปี)</p>
        <p>
          ลาคลอด 120 วัน (ได้ค่าจ้าง 60 วัน) · ลาช่วยภรรยาคลอด 15 วัน · ลาเลี้ยงดูบุตรป่วย 15 วัน (ไม่รับค่าจ้าง) ·
          ลาทำหมันตามแพทย์กำหนด · ลารับราชการทหาร ได้ค่าจ้างไม่เกิน 60 วัน/ปี
        </p>
        <p>นับวันทำงาน จันทร์–เสาร์ ไม่นับวันอาทิตย์และวันหยุดบริษัท (ยกเว้นลาคลอด/ทหาร นับทุกวัน) · ลาครึ่งวันนับตามชั่วโมง</p>
      </div>
    </div>
  );
}
