import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

import { checkCatalogHealth, getCatalogConfigOrNull } from "@/lib/catalog/client";
import { getLastCompletedSync, getWebsiteProductCount } from "@/data/catalog";
import { SYNC_TRIGGER_LABELS } from "@/lib/constants";
import { formatThaiDateTime } from "@/lib/thai-date";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const WEBHOOK_PATH = "/api/webhooks/catalog";

/**
 * Server component: checks env presence, pings the website's catalog API and
 * summarises what GCOffice currently mirrors. Renders on every request.
 */
export async function ConnectionStatusCard() {
  const config = getCatalogConfigOrNull();

  let health:
    | { ok: true; productCount: number }
    | { ok: false; error: string }
    | null = null;

  if (config) {
    try {
      const res = await checkCatalogHealth();
      health = { ok: true, productCount: res.productCount };
    } catch (err) {
      health = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const [counts, lastSync] = await Promise.all([
    getWebsiteProductCount(),
    getLastCompletedSync(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>การเชื่อมต่อ</CardTitle>
        <CardDescription>
          ตั้งค่าผ่านตัวแปรสภาพแวดล้อม CATALOG_API_URL และ CATALOG_API_KEY (ไม่มีฟอร์มตั้งค่าในระบบ)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!config ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            <div>
              ยังไม่ได้ตั้งค่า CATALOG_API_URL / CATALOG_API_KEY —
              การซิงค์และ webhook จะไม่ทำงานจนกว่าจะตั้งค่าครบ
            </div>
          </div>
        ) : health?.ok ? (
          <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
            <div>
              เชื่อมต่อแล้ว · สินค้าบนเว็บ {health.productCount.toLocaleString("th-TH")} รายการ
              <div className="text-xs text-green-800/80 mt-0.5 break-all">
                {config.baseUrl}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <XCircle className="size-4 mt-0.5 shrink-0" />
            <div>
              เชื่อมต่อไม่ได้: {health && !health.ok ? health.error : "ไม่ทราบสาเหตุ"}
              <div className="text-xs text-red-800/80 mt-0.5 break-all">
                {config.baseUrl}
              </div>
            </div>
          </div>
        )}

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground text-xs">สินค้าจากเว็บไซต์ใน GCOffice</dt>
            <dd className="mt-1 font-medium">
              {counts.total.toLocaleString("th-TH")} รายการ
              <span className="text-muted-foreground font-normal">
                {" "}
                (ใช้งาน {counts.active.toLocaleString("th-TH")})
              </span>
            </dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground text-xs">ซิงค์สำเร็จล่าสุด</dt>
            <dd className="mt-1 font-medium">
              {lastSync?.completedAt ? (
                <>
                  {formatThaiDateTime(new Date(lastSync.completedAt))}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {SYNC_TRIGGER_LABELS[lastSync.trigger] ?? lastSync.trigger}
                  </span>
                </>
              ) : (
                "ยังไม่เคยซิงค์"
              )}
            </dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground text-xs">Webhook (ตั้งค่าบนเว็บไซต์)</dt>
            <dd className="mt-1 font-mono text-xs break-all">
              GCOFFICE_WEBHOOK_URL = https://&lt;โดเมน GCOffice&gt;{WEBHOOK_PATH}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          ข้อมูลสินค้า (ชื่อ คำอธิบาย รูป ราคา สถานะ หมวดหมู่ สี) จัดการบนเว็บไซต์และถูกเขียนทับทุกครั้งที่ซิงค์
          ส่วนต้นทุน ขนาด สต็อค ราคาเฉพาะสี และสินค้าที่เพิ่มเองใน GCOffice จะไม่ถูกแก้ไข
        </p>
      </CardContent>
    </Card>
  );
}
