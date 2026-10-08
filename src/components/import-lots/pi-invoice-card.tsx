"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Package,
  Plus,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

import { matchSupplierCodesAction } from "@/actions/import-lot-actions";
import { normalizeCode, round2, type LandedLotResult } from "@/lib/landed-cost";
import { formatBaht, formatNumber } from "@/lib/thai-currency";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Input } from "@/components/ui/input";
import { ProductThumb } from "@/components/ui/product-thumb";
import { ProductPicker } from "@/components/documents/product-picker";
import { PasteItemsDialog } from "./paste-items-dialog";
import {
  MATCH_LABELS,
  emptyItem,
  newKey,
  type LotInvoiceState,
  type LotItemState,
} from "./types";

interface PiInvoiceCardProps {
  index: number;
  invoice: LotInvoiceState;
  landed?: LandedLotResult["invoices"][number];
  onChange: (update: (prev: LotInvoiceState) => LotInvoiceState) => void;
  onRemove: () => void;
}

const fmtCny = (n: number) => `¥${formatNumber(n)}`;

export function PiInvoiceCard({ index, invoice, landed, onChange, onRemove }: PiInvoiceCardProps) {
  const [matching, startMatching] = useTransition();

  const set = (patch: Partial<LotInvoiceState>) => onChange((prev) => ({ ...prev, ...patch }));
  const setItem = (key: string, patch: Partial<LotItemState>) =>
    onChange((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    }));
  const removeItem = (key: string) =>
    onChange((prev) => ({ ...prev, items: prev.items.filter((it) => it.key !== key) }));
  const setFees = (fn: (fees: LotInvoiceState["fees"]) => LotInvoiceState["fees"]) =>
    onChange((prev) => ({ ...prev, fees: fn(prev.fees) }));

  const goodsCny = round2(invoice.items.reduce((s, it) => s + (it.amountCny || 0), 0));
  const feesCny = round2(invoice.fees.reduce((s, f) => s + (f.amountCny || 0), 0));
  const enteredTotal = round2(goodsCny + feesCny);
  const totalDiff =
    invoice.statedTotalCny != null && invoice.statedTotalCny > 0
      ? round2(enteredTotal - invoice.statedTotalCny)
      : null;
  const unmatched = invoice.items.filter((it) => !it.match).length;

  /** Auto-match every unmatched line with a code (or only `onlyKeys`). */
  const autoMatch = (items: LotItemState[], onlyKeys?: string[]) => {
    const targets = items.filter(
      (it) => !it.match && it.supplierCode.trim() && (!onlyKeys || onlyKeys.includes(it.key))
    );
    if (targets.length === 0) return;
    startMatching(async () => {
      try {
        const matches = await matchSupplierCodesAction(
          invoice.supplierName,
          targets.map((t) => t.supplierCode)
        );
        const targetKeys = new Set(targets.map((t) => t.key));
        const found = targets.filter((t) => matches[normalizeCode(t.supplierCode)]).length;
        // Apply to the latest state; skip lines the user matched or retyped meanwhile
        onChange((prev) => ({
          ...prev,
          items: prev.items.map((it) => {
            if (!targetKeys.has(it.key) || it.match) return it;
            const m = matches[normalizeCode(it.supplierCode)];
            return m ? { ...it, match: m, rememberAlias: m.matchedBy === "name" } : it;
          }),
        }));
        if (!onlyKeys) {
          toast[found > 0 ? "success" : "info"](
            found > 0 ? `จับคู่ได้ ${found} รายการ` : "ไม่พบสินค้าที่ตรงกับรหัส กรุณาเลือกเอง"
          );
        }
      } catch {
        toast.error("จับคู่สินค้าไม่สำเร็จ");
      }
    });
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full text-sm font-semibold">
              {index + 1}
            </span>
            <span className="font-semibold">ใบ PI</span>
            {invoice.imageUrl && (
              <a
                href={invoice.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
              >
                ดูรูปใบ PI <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
            ลบใบนี้
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">ร้าน / โรงงาน</label>
            <Input
              value={invoice.supplierName}
              placeholder="เช่น TILEND, ShuangOu"
              onChange={(e) => set({ supplierName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">เลขที่ PI</label>
            <Input value={invoice.piNumber} onChange={(e) => set({ piNumber: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">วันที่ PI</label>
            <Input type="date" value={invoice.piDate} onChange={(e) => set({ piDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">ยอด TOTAL ในใบ (¥)</label>
            <DecimalInput
              value={invoice.statedTotalCny ?? ""}
              placeholder="ใช้ตรวจยอด"
              onChange={(v) => set({ statedTotalCny: v || null })}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Column headings (desktop) */}
        <div className="text-muted-foreground hidden grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_80px_120px_100px_120px_36px] gap-2 text-xs font-medium lg:grid">
          <span>รหัสสินค้าจีน</span>
          <span>สินค้าของเรา</span>
          <span>กล่อง</span>
          <span>ยอดเงิน (¥)</span>
          <span>น้ำหนัก (กก.)</span>
          <span className="text-right">ต้นทุน/กล่อง</span>
          <span />
        </div>

        {invoice.items.map((item, i) => {
          const result = landed?.items[i];
          return (
            <div
              key={item.key}
              className={cn(
                "grid grid-cols-2 gap-2 rounded-lg border p-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_80px_120px_100px_120px_36px] lg:items-center lg:border-0 lg:p-0",
                !item.match && "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 lg:border lg:p-1"
              )}
            >
              <div className="col-span-2 lg:col-span-1">
                <label className="text-muted-foreground text-xs lg:hidden">รหัสสินค้าจีน</label>
                <Input
                  value={item.supplierCode}
                  placeholder="เช่น YSP125-Q304"
                  onChange={(e) => setItem(item.key, { supplierCode: e.target.value })}
                  onBlur={() => autoMatch(invoice.items, [item.key])}
                />
              </div>

              <div className="col-span-2 flex min-w-0 items-center gap-2 lg:col-span-1">
                {item.match ? (
                  <>
                    <ProductThumb src={item.match.imageUrl} alt={item.match.productName} size={36} fallback="icon" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.match.productName}
                        {item.match.variantName && (
                          <span className="text-muted-foreground"> · {item.match.variantName}</span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1.5 py-0 text-[10px]",
                            item.match.matchedBy === "name" && "border-amber-400 text-amber-700"
                          )}
                        >
                          {MATCH_LABELS[item.match.matchedBy]}
                        </Badge>
                        {(item.match.matchedBy === "manual" || item.match.matchedBy === "name") && (
                          <label className="text-muted-foreground flex items-center gap-1 text-[11px]">
                            <input
                              type="checkbox"
                              checked={item.rememberAlias}
                              onChange={(e) => setItem(item.key, { rememberAlias: e.target.checked })}
                            />
                            จำรหัสนี้ไว้ใช้ครั้งหน้า
                          </label>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      title="ยกเลิกการจับคู่"
                      onClick={() => setItem(item.key, { match: null, rememberAlias: false })}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle className="size-3.5" />
                      ยังไม่จับคู่
                    </span>
                    <ProductPicker
                      onSelect={(p) =>
                        setItem(item.key, {
                          match: {
                            productId: p.productId ?? "",
                            colorVariantId: p.colorVariantId ?? null,
                            productName: p.name,
                            productSku: p.sku,
                            variantName: p.colorVariantName ?? null,
                            variantSku: p.colorVariantSku ?? null,
                            imageUrl: p.imageUrl ?? null,
                            matchedBy: "manual",
                          },
                          rememberAlias: true,
                        })
                      }
                    >
                      <Button type="button" variant="outline" size="sm">
                        <Package className="size-4" />
                        เลือกสินค้า
                      </Button>
                    </ProductPicker>
                  </>
                )}
              </div>

              <div>
                <label className="text-muted-foreground text-xs lg:hidden">กล่อง</label>
                <Input
                  type="number"
                  min={0}
                  value={item.boxes || ""}
                  onChange={(e) => setItem(item.key, { boxes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs lg:hidden">ยอดเงิน (¥)</label>
                <DecimalInput value={item.amountCny || ""} onChange={(v) => setItem(item.key, { amountCny: v })} />
              </div>
              <div>
                <label className="text-muted-foreground text-xs lg:hidden">น้ำหนัก (กก.)</label>
                <DecimalInput
                  value={item.weightKg ?? ""}
                  onChange={(v) => setItem(item.key, { weightKg: v || null })}
                />
              </div>
              <div className="text-right">
                <label className="text-muted-foreground block text-xs lg:hidden">ต้นทุน/กล่อง</label>
                <span className="text-sm font-semibold tabular-nums">
                  {result && item.boxes > 0 ? formatBaht(result.landedPerBox) : "-"}
                </span>
              </div>
              <div className="col-span-2 flex justify-end lg:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-8"
                  onClick={() => removeItem(item.key)}
                  disabled={invoice.items.length <= 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}
          >
            <Plus className="size-4" />
            เพิ่มรายการ
          </Button>
          <PasteItemsDialog
            onPaste={(rows) => {
              const added = rows.map((r) =>
                emptyItem({
                  supplierCode: r.supplierCode,
                  boxes: r.boxes,
                  amountCny: r.amountCny,
                  weightKg: r.weightKg,
                })
              );
              onChange((prev) => ({
                ...prev,
                items: [...prev.items.filter((it) => it.supplierCode.trim() || it.amountCny), ...added],
              }));
              autoMatch(added);
            }}
          />
          {unmatched > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={matching}
              onClick={() => autoMatch(invoice.items)}
            >
              {matching ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              จับคู่อัตโนมัติ ({unmatched})
            </Button>
          )}
        </div>

        {/* China-side fees on this PI */}
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">ค่าใช้จ่ายฝั่งจีนในใบนี้ (¥)</p>
              <p className="text-muted-foreground text-xs">
                เช่น ค่าพาเลท, ค่าส่งไปโกดังเอเจนต์ ระบบเฉลี่ยเข้าต้นทุนสินค้าในใบนี้ตามน้ำหนัก
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFees((fees) => [...fees, { key: newKey(), label: "", amountCny: 0 }])}
            >
              <Plus className="size-4" />
              เพิ่ม
            </Button>
          </div>
          {invoice.fees.map((fee) => (
            <div key={fee.key} className="flex items-center gap-2">
              <Input
                className="flex-1"
                value={fee.label}
                placeholder="ชื่อค่าใช้จ่าย"
                onChange={(e) =>
                  setFees((fees) => fees.map((f) => (f.key === fee.key ? { ...f, label: e.target.value } : f)))
                }
              />
              <DecimalInput
                className="w-32"
                value={fee.amountCny || ""}
                onChange={(v) =>
                  setFees((fees) => fees.map((f) => (f.key === fee.key ? { ...f, amountCny: v } : f)))
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setFees((fees) => fees.filter((f) => f.key !== fee.key))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* PI total check */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            สินค้า {fmtCny(goodsCny)} + ค่าใช้จ่าย {fmtCny(feesCny)} ={" "}
            <span className="text-foreground font-semibold">{fmtCny(enteredTotal)}</span>
          </span>
          {totalDiff != null &&
            (Math.abs(totalDiff) < 0.01 ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="size-4" />
                ตรงกับยอดในใบ
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="size-4" />
                ไม่ตรงกับยอดในใบ ({totalDiff > 0 ? "+" : ""}
                {fmtCny(totalDiff)})
              </span>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
