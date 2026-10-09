"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RefreshCw, TrendingUp } from "lucide-react";

import { relockDocumentCosts, updateDocumentCosts } from "@/actions/import-lot-actions";
import type { DocumentProfit } from "@/data/document-profit";
import type { CostSource } from "@/data/import-lots";
import { formatBaht } from "@/lib/thai-currency";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecimalInput } from "@/components/ui/decimal-input";

import { LotCostPicker } from "./lot-cost-picker";

const SOURCE_LABELS: Record<CostSource, string> = {
  manual: "กรอกเอง",
  snapshot: "ล็อกไว้ตอนยืนยันบิล",
  variant: "เฉลี่ยจากล็อต (สีนี้)",
  product: "เฉลี่ยจากล็อต (สินค้า)",
  legacy: "จากหน้าต้นทุนสินค้า",
  none: "ยังไม่มีต้นทุน",
};

/**
 * Admin-only profit summary under a quotation/invoice: revenue (ex VAT) −
 * landed cost of the boxes sold − what we paid to deliver = profit.
 */
export function DocumentProfitCard({ profit }: { profit: DocumentProfit }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [delivery, setDelivery] = useState<number>(profit.actualDeliveryCost);
  // Manual cost per line; "" = use the suggested (lot average)
  const [costs, setCosts] = useState<Record<string, number | "">>(() =>
    Object.fromEntries(profit.lines.map((l) => [l.id, l.manual && l.unitCost != null ? l.unitCost : ""]))
  );
  // Lot line picked for a cost (label shown until the card reloads)
  const [picked, setPicked] = useState<Record<string, string>>({});

  const live = useMemo(() => {
    const lines = profit.lines.map((l) => {
      const manual = costs[l.id];
      const unitCost = manual !== "" && manual != null ? manual : l.suggestedCost;
      return { ...l, effective: unitCost, isManual: manual !== "" && manual != null };
    });
    const cogs = lines.reduce((s, l) => s + (l.effective ?? 0) * l.quantity, 0);
    const result = profit.revenue - cogs - (delivery || 0);
    return {
      lines,
      cogs,
      profit: result,
      margin: profit.revenue > 0 ? (result / profit.revenue) * 100 : 0,
      missing: lines.filter((l) => l.effective == null).length,
    };
  }, [costs, delivery, profit]);

  const dirty =
    delivery !== profit.actualDeliveryCost ||
    profit.lines.some((l) => (costs[l.id] === "" ? null : costs[l.id]) !== (l.manual ? l.unitCost : null));

  // A locked cost that no longer matches today's lot average (e.g. the bill was
  // confirmed before its lot was entered)
  const staleLocks = !profit.sold ? 0 : profit.lines.filter(
    (l) => !l.manual && l.averageCost != null && l.costSnapshot !== l.averageCost
  ).length;

  function relock() {
    startTransition(async () => {
      const res = await relockDocumentCosts(profit.documentId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("คำนวณต้นทุนใหม่จากล็อตล่าสุดแล้ว");
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      const res = await updateDocumentCosts(profit.documentId, {
        actualDeliveryCost: delivery || null,
        lines: profit.lines.map((l) => ({
          id: l.id,
          unitCost: costs[l.id] === "" || costs[l.id] == null ? null : Number(costs[l.id]),
        })),
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("บันทึกต้นทุนแล้ว");
      router.refresh();
    });
  }

  return (
    <Card className="mt-6 border-emerald-200 dark:border-emerald-900">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5 text-emerald-600" />
          สรุปต้นทุน-กำไร
          <span className="text-muted-foreground text-xs font-normal">(เห็นเฉพาะแอดมิน)</span>
        </CardTitle>
        <Link href="/import-lots" className="text-primary text-sm underline-offset-4 hover:underline">
          ไปหน้าล็อตนำเข้า
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {live.lines.map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-[minmax(0,1fr)_170px] items-center gap-2 border-b pb-2 text-sm last:border-0 sm:grid-cols-[minmax(0,1fr)_70px_190px_110px] lg:grid-cols-[minmax(0,1fr)_70px_240px_110px]"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">
                  {l.productSku && <span className="text-muted-foreground mr-1.5 block font-mono text-xs whitespace-nowrap sm:inline">{l.productSku}</span>}
                  {l.productName}
                  {l.colorVariantName && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {l.colorVariantName}
                      {l.colorVariantSku && <span className="font-mono text-xs whitespace-nowrap"> ({l.colorVariantSku})</span>}
                    </span>
                  )}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    l.effective == null ? "flex items-center gap-1 text-amber-700" : "text-muted-foreground"
                  )}
                >
                  {l.effective == null && <AlertTriangle className="size-3" />}
                  {l.isManual ? (picked[l.id] ?? SOURCE_LABELS.manual) : SOURCE_LABELS[l.suggestedSource]}
                </p>
              </div>
              <span className="text-muted-foreground hidden text-right tabular-nums sm:block">
                × {l.quantity.toLocaleString("th-TH")}
              </span>
              <div className="flex items-center gap-1">
                <DecimalInput
                  value={costs[l.id] ?? ""}
                  placeholder={l.suggestedCost != null ? `${l.suggestedCost} /หน่วย` : "ต้นทุน/หน่วย"}
                  onChange={(v) => {
                    setCosts((prev) => ({ ...prev, [l.id]: v || "" }));
                    setPicked((prev) => {
                      const next = { ...prev };
                      delete next[l.id];
                      return next;
                    });
                  }}
                />
                <LotCostPicker
                  line={l}
                  onPick={(cost, label) => {
                    setCosts((prev) => ({ ...prev, [l.id]: cost }));
                    setPicked((prev) => ({ ...prev, [l.id]: `เลือกจาก${label} — กดบันทึกต้นทุน` }));
                  }}
                />
              </div>
              <span className="hidden text-right tabular-nums sm:block">
                {l.effective != null ? formatBaht(l.effective * l.quantity) : "-"}
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
          <div>
            <p className="text-sm font-medium">ค่าขนส่งจริง ออฟฟิศ → หน้าไซต์</p>
            <p className="text-muted-foreground text-xs">ที่บริษัทจ่ายคนส่ง (ไม่ใช่ค่าส่งที่เก็บลูกค้า)</p>
          </div>
          <DecimalInput value={delivery || ""} placeholder="0.00" onChange={setDelivery} />
        </div>

        <div className="bg-muted/50 grid grid-cols-2 gap-3 rounded-lg p-3 text-sm sm:grid-cols-4">
          <Figure label="รายได้ (ไม่รวม VAT)" value={formatBaht(profit.revenue)} />
          <Figure label="ต้นทุนสินค้า" value={formatBaht(live.cogs)} />
          <Figure label="ค่าขนส่งจริง" value={formatBaht(delivery || 0)} />
          <Figure
            label={`กำไร (${live.margin.toFixed(1)}%)`}
            value={formatBaht(live.profit)}
            className={live.profit >= 0 ? "text-emerald-600" : "text-red-600"}
          />
        </div>
        {live.missing > 0 && (
          <p className="text-xs text-amber-700">
            มี {live.missing} รายการที่ยังไม่มีต้นทุน กำไรจึงสูงเกินจริง — กดปุ่ม &quot;จากล็อต&quot; เพื่อเลือกรายการในล็อตนำเข้า หรือกรอกต้นทุนเอง
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          ต้นทุนใช้ค่าเฉลี่ยถ่วงน้ำหนักจากล็อตนำเข้า และถูกล็อกไว้ตอนยืนยันบิล
          เพื่อไม่ให้กำไรของบิลที่ขายไปแล้วเปลี่ยนเมื่อมีล็อตใหม่เข้ามา
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {staleLocks > 0 && (
            <Button type="button" variant="outline" onClick={relock} disabled={isPending}>
              <RefreshCw className="size-4" />
              คำนวณต้นทุนใหม่จากล็อตล่าสุด ({staleLocks})
            </Button>
          )}
          <Button type="button" onClick={save} disabled={!dirty || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            บันทึกต้นทุน
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={cn("text-base font-semibold tabular-nums", className)}>{value}</p>
    </div>
  );
}
