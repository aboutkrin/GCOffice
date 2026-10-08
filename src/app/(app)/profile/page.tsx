import Link from "next/link";
import { FileText } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getProfileById } from "@/data/profiles";
import { getMyLeaveSummary } from "@/data/leave-balances";
import { getMyPayslips } from "@/data/payroll";
import { getThaiNow, formatThaiDate, THAI_MONTHS } from "@/lib/thai-date";
import { formatBaht } from "@/lib/thai-currency";
import { formatLeaveHours } from "@/lib/leave-policy";
import {
  LEAVE_PERIOD_LABELS,
  LEAVE_STATUS_COLORS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ProfileForm } from "@/components/profile/profile-form";
import { LeaveBalanceCards } from "@/components/leave/leave-balance-cards";
import { YearSwitcher } from "@/components/leave/year-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const TABS = ["leave", "payslips", "profile"] as const;

interface ProfilePageProps {
  searchParams: Promise<{ tab?: string; year?: string }>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const tab = (TABS as readonly string[]).includes(params.tab ?? "") ? params.tab! : "leave";
  const thisYear = getThaiNow().year;
  const year = parseInt(params.year ?? "", 10) || thisYear;

  const [profile, leave, payslips] = await Promise.all([
    getProfileById(user.id),
    getMyLeaveSummary(user.id, year),
    getMyPayslips(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">บัญชีของฉัน</h1>
        <p className="text-muted-foreground">วันลาคงเหลือ สลิปเงินเดือน และข้อมูลส่วนตัว</p>
      </div>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="leave">วันลา</TabsTrigger>
          <TabsTrigger value="payslips">สลิปเงินเดือน</TabsTrigger>
          <TabsTrigger value="profile">โปรไฟล์</TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="space-y-6 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              สิทธิ์วันลาตามกฎหมายแรงงาน นับตามปีปฏิทิน (รีเซ็ต 1 ม.ค.) · ลาภายในสิทธิ์ได้รับค่าจ้างตามปกติ
            </p>
            <YearSwitcher year={year} hrefFor={(y) => `/profile?tab=leave&year=${y}`} />
          </div>

          <LeaveBalanceCards summary={leave.summary} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ประวัติการลา ปี {year + 543}</CardTitle>
            </CardHeader>
            <CardContent>
              {leave.history.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  ยังไม่มีการลาในปีนี้ ขอลาได้ที่ปฏิทินทีมในหน้าแดชบอร์ด
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ประเภท</TableHead>
                        <TableHead className="text-right">จำนวน</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>หมายเหตุ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leave.history.map((l) => {
                        const start = formatThaiDate(new Date(l.startDate), "short");
                        const end = formatThaiDate(new Date(l.endDate), "short");
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="whitespace-nowrap">
                              {start === end ? start : `${start} – ${end}`}
                            </TableCell>
                            <TableCell>
                              {LEAVE_TYPE_LABELS[l.type] ?? l.type}
                              <div className="text-xs text-muted-foreground">
                                {LEAVE_PERIOD_LABELS[l.period]}
                              </div>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {formatLeaveHours(l.hours)}
                              {l.unpaidHours > 0 && (
                                <div className="text-xs text-red-600">
                                  หักเงิน {formatLeaveHours(l.unpaidHours)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("border-0", LEAVE_STATUS_COLORS[l.status])}>
                                {LEAVE_STATUS_LABELS[l.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {[l.reason, l.reviewNote && `แอดมิน: ${l.reviewNote}`].filter(Boolean).join(" · ") ||
                                "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">สลิปเงินเดือนของฉัน</CardTitle>
            </CardHeader>
            <CardContent>
              {payslips.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  ยังไม่มีสลิปเงินเดือนที่ยืนยันแล้ว
                </p>
              ) : (
                <ul className="divide-y">
                  {payslips.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <div className="font-medium">
                          {THAI_MONTHS[p.month - 1]} {p.year + 543}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          รับสุทธิ {formatBaht(p.netPay)}
                          {p.leaveDeduction > 0 && ` · หักลา ${formatBaht(p.leaveDeduction)}`}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/profile/payslips/${p.id}`}>
                          <FileText className="size-4" />
                          ดูสลิป
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="pt-4">
          <ProfileForm
            initialData={
              profile
                ? {
                    firstName: profile.firstName ?? "",
                    lastName: profile.lastName ?? "",
                    signatureUrl: profile.signatureUrl ?? "",
                  }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
