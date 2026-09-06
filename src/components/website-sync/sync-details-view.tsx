import type { CatalogSyncDetails } from "@/lib/catalog/sync";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SyncDetailsViewProps {
  totalFetched: number;
  created: number;
  updated: number;
  deactivated: number;
  failed: number;
  details: CatalogSyncDetails | null;
  errorMessage?: string | null;
  /**
   * "preview" — a fresh dry run: toCreate/toUpdate/toDeactivate/categoriesToCreate
   * are populated and describe what WOULD happen.
   * "history" — a completed real run: those fields are empty by design (the
   * real counts are the scalar props); only unmatchedColours/errors/unchanged
   * are populated.
   */
  mode: "preview" | "history";
}

export function SyncDetailsView({
  totalFetched,
  created,
  updated,
  deactivated,
  failed,
  details,
  errorMessage,
  mode,
}: SyncDetailsViewProps) {
  return (
    <ScrollArea className="max-h-[60vh] pr-3">
      <div className="space-y-5 text-sm">
        {errorMessage && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
            {errorMessage}
          </div>
        )}

        {mode === "preview" && details && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="สินค้าบนเว็บ" value={totalFetched} />
            <Stat label="จะเพิ่มใหม่" value={details.toCreate.length} />
            <Stat label="จะอัปเดต" value={details.toUpdate} />
            <Stat label="จะปิดใช้งาน" value={details.toDeactivate.length} />
          </div>
        )}

        {mode === "history" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="เพิ่มใหม่" value={created} />
            <Stat label="อัปเดต" value={updated} />
            <Stat label="ปิดใช้งาน" value={deactivated} />
            <Stat label="ล้มเหลว" value={failed} />
            <Stat label="ไม่เปลี่ยนแปลง" value={details?.unchanged ?? 0} />
          </div>
        )}

        {!details ? (
          <p className="text-muted-foreground text-xs">
            ไม่มีรายละเอียดสำหรับการซิงค์ครั้งนี้
          </p>
        ) : (
          <>
            {mode === "preview" && (
              <>
                <Section
                  title="สินค้าที่จะเพิ่มใหม่"
                  count={details.toCreate.length}
                  emptyText="ไม่มี"
                >
                  <ul className="list-disc pl-5 space-y-0.5">
                    {details.toCreate.map((p, i) => (
                      <li key={`${p.sku}-${i}`}>
                        <span className="font-mono text-xs">{p.sku}</span> — {p.name}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  title="สินค้าที่จะถูกปิดใช้งาน (ไม่มีบนเว็บไซต์แล้ว)"
                  count={details.toDeactivate.length}
                  emptyText="ไม่มี"
                >
                  <ul className="list-disc pl-5 space-y-0.5">
                    {details.toDeactivate.map((p) => (
                      <li key={p.sku}>
                        <span className="font-mono text-xs">{p.sku}</span> — {p.name}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section
                  title="หมวดหมู่ที่จะสร้างใหม่"
                  count={details.categoriesToCreate.length}
                  emptyText="ไม่มี"
                >
                  <ul className="list-disc pl-5 space-y-0.5">
                    {details.categoriesToCreate.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </Section>
              </>
            )}

            <Section
              title="สีที่ชื่อไม่ตรงกัน"
              count={details.unmatchedColours.length}
              emptyText="ไม่มี"
              hint="สีใน GCOffice ที่ชื่อไม่ตรงกับเว็บไซต์จะไม่ถูกรวมกัน — สีเดิมจะคงอยู่ (พร้อมสต็อค) และสีจากเว็บจะถูกเพิ่มใหม่ หากต้องการรวม ให้เปลี่ยนชื่อสีใน GCOffice ให้ตรงกับเว็บไซต์ก่อนซิงค์"
            >
              <div className="space-y-2">
                {details.unmatchedColours.map((u) => (
                  <div key={u.productSku} className="rounded-md border p-2">
                    <div className="font-medium">
                      <span className="font-mono text-xs">{u.productSku}</span> — {u.productName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      GCOffice: {u.gcofficeNames.join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      เว็บไซต์: {u.websiteNames.join(", ")}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {details.errors.length > 0 && (
              <Section title="ข้อผิดพลาด" count={details.errors.length} emptyText="">
                <ul className="list-disc pl-5 space-y-0.5 text-red-700">
                  {details.errors.map((e) => (
                    <li key={e.websiteProductId}>
                      #{e.websiteProductId} {e.name}: {e.message}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value.toLocaleString("th-TH")}</div>
    </div>
  );
}

function Section({
  title,
  count,
  emptyText,
  hint,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <h3 className="font-medium">{title}</h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {count}
        </Badge>
      </div>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      {count === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}
