import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getUserById } from "@/data/users";
import { getMyLeaveSummary } from "@/data/leave-balances";
import { getMyPayslips } from "@/data/payroll";
import { getCurrentUser } from "@/lib/auth";
import { getThaiNow } from "@/lib/thai-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserForm } from "@/components/users/user-form";
import { LeaveBalanceCards } from "@/components/leave/leave-balance-cards";
import { YearSwitcher } from "@/components/leave/year-switcher";
import { LeaveHistoryCard } from "@/components/profile/leave-history-card";
import { PayslipListCard } from "@/components/profile/payslip-list-card";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; year?: string }>;
}

export const dynamic = 'force-dynamic';

const TABS = ["leave", "payslips", "profile"] as const;

/** ADMIN view of one employee: the same วันลา / สลิปเงินเดือน tabs as /profile, plus the account form. */
export default async function EditUserPage({ params, searchParams }: EditUserPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const tab = (TABS as readonly string[]).includes(query.tab ?? "") ? query.tab! : "leave";
  const year = parseInt(query.year ?? "", 10) || getThaiNow().year;

  const [user, currentUser, leave, payslips] = await Promise.all([
    getUserById(id),
    getCurrentUser(),
    getMyLeaveSummary(id, year),
    getMyPayslips(id, { includeDrafts: true }),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/users">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email}
          </h1>
          <p className="text-muted-foreground text-sm">วันลา สลิปเงินเดือน และข้อมูลผู้ใช้งาน</p>
        </div>
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
            <YearSwitcher year={year} hrefFor={(y) => `/users/${id}?tab=leave&year=${y}`} />
          </div>

          <LeaveBalanceCards summary={leave.summary} />

          <LeaveHistoryCard year={year} history={leave.history} emptyText="ยังไม่มีการลาในปีนี้" />
        </TabsContent>

        <TabsContent value="payslips" className="pt-4">
          <PayslipListCard
            title="สลิปเงินเดือน"
            payslips={payslips}
            emptyText="ยังไม่มีสลิปเงินเดือน"
            hrefFor={(slipId) => `/payroll/${slipId}/slip?from=user`}
            showStatus
          />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6 pt-4">
          <UserForm initialData={user} isSelf={currentUser?.id === id} />

          {user.signatureUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ลายเซ็น</CardTitle>
              </CardHeader>
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.signatureUrl} alt="ลายเซ็น" className="h-20 w-auto object-contain" />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
