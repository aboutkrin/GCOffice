import { requireUser } from "@/lib/auth";
import { getProfileById } from "@/data/profiles";
import { getMyLeaveSummary } from "@/data/leave-balances";
import { getMyPayslips } from "@/data/payroll";
import { getThaiNow } from "@/lib/thai-date";
import { ProfileForm } from "@/components/profile/profile-form";
import { LeaveHistoryCard } from "@/components/profile/leave-history-card";
import { PayslipListCard } from "@/components/profile/payslip-list-card";
import { LeaveBalanceCards } from "@/components/leave/leave-balance-cards";
import { YearSwitcher } from "@/components/leave/year-switcher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

          <LeaveHistoryCard
            year={year}
            history={leave.history}
            emptyText="ยังไม่มีการลาในปีนี้ ขอลาได้ที่ปฏิทินทีมในหน้าแดชบอร์ด"
          />
        </TabsContent>

        <TabsContent value="payslips" className="pt-4">
          <PayslipListCard
            title="สลิปเงินเดือนของฉัน"
            payslips={payslips}
            emptyText="ยังไม่มีสลิปเงินเดือนที่ยืนยันแล้ว"
            hrefFor={(id) => `/profile/payslips/${id}`}
          />
        </TabsContent>

        <TabsContent value="profile" className="pt-4">
          <ProfileForm
            initialData={
              profile
                ? {
                    firstName: profile.firstName ?? "",
                    lastName: profile.lastName ?? "",
                    signatureUrl: profile.signatureUrl ?? "",
                    bankName: profile.bankName ?? "",
                    bankAccountName: profile.bankAccountName ?? "",
                    bankAccountNumber: profile.bankAccountNumber ?? "",
                  }
                : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
