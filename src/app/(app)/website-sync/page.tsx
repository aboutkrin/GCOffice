import { getCatalogSyncLogs, getLastCompletedSync } from "@/data/catalog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConnectionStatusCard } from "@/components/website-sync/connection-status-card";
import { SyncHistoryTable } from "@/components/website-sync/sync-history-table";

export const dynamic = "force-dynamic";
// The sync buttons are Server Actions invoked from this page, so they run under
// this route's limit. A full run over the whole catalog must not be cut off.
export const maxDuration = 300;

export default async function WebsiteSyncPage() {
  const [syncLogs, lastCompleted] = await Promise.all([
    getCatalogSyncLogs(),
    getLastCompletedSync(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ซิงค์เว็บไซต์</h1>
        <p className="text-muted-foreground text-sm">
          ดึงสินค้าและสีสินค้าจาก goodchoiceth.com เข้าสู่ GCOffice
        </p>
      </div>

      <ConnectionStatusCard />

      <Card>
        <CardHeader>
          <CardTitle>ประวัติการซิงค์</CardTitle>
          <CardDescription>
            ตรวจสอบผลลัพธ์ก่อนซิงค์จริง ดูประวัติ และเริ่มซิงค์ใหม่
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SyncHistoryTable
            syncLogs={syncLogs}
            lastSyncAt={lastCompleted?.completedAt ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
