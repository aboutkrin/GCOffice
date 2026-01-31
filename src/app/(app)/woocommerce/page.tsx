import { getWooCommerceConfig, getWooCommerceSyncLogs } from "@/data/woocommerce";
import { serialize } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WooCommerceConfigForm } from "@/components/woocommerce/woocommerce-config-form";
import { SyncHistoryTable } from "@/components/woocommerce/sync-history-table";

export const dynamic = "force-dynamic";

export default async function WooCommercePage() {
  const config = await getWooCommerceConfig();
  const syncLogs = config
    ? serialize(await getWooCommerceSyncLogs())
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WooCommerce</h1>
        <p className="text-muted-foreground text-sm">
          เชื่อมต่อและซิงค์สินค้าจาก WooCommerce
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>การเชื่อมต่อ</CardTitle>
          <CardDescription>
            ตั้งค่าข้อมูลการเชื่อมต่อกับร้านค้า WooCommerce
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WooCommerceConfigForm config={config} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ประวัติการซิงค์</CardTitle>
          <CardDescription>
            ดูประวัติการซิงค์สินค้าและเริ่มซิงค์ใหม่
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SyncHistoryTable
            syncLogs={syncLogs}
            configId={config?.id ?? null}
            lastSyncAt={config?.lastSyncAt ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
