"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, PackageSearch, Search, X } from "lucide-react";

import { linkLotItemToProduct, searchLotItemsForCostAction } from "@/actions/import-lot-actions";
import type { LotItemOption } from "@/data/import-lots";
import { blendLotCost, type CostBreakdownPart } from "@/lib/line-cost";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDateShort } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface LotCostPickerLine {
  productName: string;
  colorVariantName: string | null;
  productId: string | null;
  colorVariantId: string | null;
  quantity: number;
}

type Selected = CostBreakdownPart & { productId: string | null };

/**
 * Profit card: pick the import lot line(s) a sold item came from — e.g. 5 boxes
 * from this lot and 1 left in stock from an older one. Fills the line's cost
 * with the box-weighted landed cost per box; a lot line not yet matched to any
 * product can be linked to this product at the same time.
 */
export function LotCostPicker({
  line,
  breakdown,
  onPick,
}: {
  line: LotCostPickerLine;
  /** Lots saved on the line, shown again when the picker reopens */
  breakdown: CostBreakdownPart[];
  onPick: (cost: number, breakdown: CostBreakdownPart[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<LotItemOption[] | null>(null);
  const [link, setLink] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isLinking, startLinking] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchLotItemsForCostAction({
          productId: line.productId,
          colorVariantId: line.colorVariantId,
          query,
        });
        if (!cancelled) setItems(res);
      } catch {
        if (!cancelled) toast.error("โหลดรายการในล็อตไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, query, line.productId, line.colorVariantId]);

  const chosenBoxes = selected.reduce((sum, p) => sum + (p.boxes || 0), 0);
  const blended = blendLotCost(selected);

  function add(it: LotItemOption) {
    if (selected.some((p) => p.lotItemId === it.id)) {
      setSelected((prev) => prev.filter((p) => p.lotItemId !== it.id));
      return;
    }
    setSelected((prev) => [
      ...prev,
      {
        lotItemId: it.id,
        lotLabel: `ล็อต ${it.lotNumber || it.lotName} · ${it.supplierCode}`,
        supplierCode: it.supplierCode,
        boxes: Math.max(1, line.quantity - chosenBoxes),
        landedPerBox: it.landedPerBox,
        productId: it.productId,
      },
    ]);
  }

  function setBoxes(id: string, boxes: number) {
    setSelected((prev) => prev.map((p) => (p.lotItemId === id ? { ...p, boxes } : p)));
  }

  function apply() {
    if (blended == null) return;
    const parts: CostBreakdownPart[] = selected.map((p) => ({
      lotItemId: p.lotItemId,
      lotLabel: p.lotLabel,
      supplierCode: p.supplierCode,
      boxes: p.boxes,
      landedPerBox: p.landedPerBox,
    }));
    const toLink = link && line.productId ? selected.filter((p) => !p.productId) : [];
    if (toLink.length === 0) {
      onPick(blended, parts);
      setOpen(false);
      return;
    }
    startLinking(async () => {
      for (const p of toLink) {
        const res = await linkLotItemToProduct(p.lotItemId, line.productId!, line.colorVariantId);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
      }
      toast.success(`จับคู่ ${toLink.map((p) => p.supplierCode).join(", ")} กับ ${line.productName} แล้ว`);
      onPick(blended, parts);
      setOpen(false);
    });
  }

  const hasUnmatched = items?.some((it) => !it.productId);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0"
        title="เลือกต้นทุนจากล็อตนำเข้า"
        onClick={() => {
          setQuery("");
          // breakdown rows were linked when saved (or are now matched by alias)
          setSelected(breakdown.map((p) => ({ ...p, productId: line.productId })));
          setOpen(true);
        }}
      >
        <PackageSearch className="size-4" />
        <span className="hidden lg:inline">จากล็อต</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>เลือกต้นทุนจากล็อตนำเข้า</DialogTitle>
            <DialogDescription>
              {line.productName}
              {line.colorVariantName ? ` · ${line.colorVariantName}` : ""} × {line.quantity.toLocaleString("th-TH")} — เลือกรายการในใบ
              PI ที่สินค้านี้มาจาก ถ้ามาจากหลายล็อตให้เลือกทุกล็อตแล้วใส่จำนวนกล่อง ระบบจะเฉลี่ยต้นทุนต่อกล่อง
              (รวมค่าขนส่งจีน-ไทยแล้ว) ให้
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              autoFocus
              className="pl-8"
              value={query}
              placeholder="ค้นหารหัสสินค้าใน PI, เลขล็อต, เลข tracking, ชื่อ supplier"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="max-h-[50vh] space-y-1 overflow-y-auto">
            {loading && items == null ? (
              <p className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                <Loader2 className="size-4 animate-spin" /> กำลังโหลด...
              </p>
            ) : !items || items.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {query
                  ? "ไม่พบรายการที่ตรงกับคำค้น"
                  : "ยังไม่มีรายการในล็อตที่จับคู่กับสินค้านี้ — พิมพ์รหัสสินค้าใน PI หรือเลขล็อตเพื่อค้นหา"}
              </p>
            ) : (
              items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  disabled={isLinking}
                  onClick={() => add(it)}
                  className={cn(
                    "hover:bg-muted flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm disabled:opacity-50",
                    selected.some((p) => p.lotItemId === it.id) && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                  )}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0 text-emerald-600",
                      !selected.some((p) => p.lotItemId === it.id) && "invisible"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {it.supplierCode}
                      {it.description && (
                        <span className="text-muted-foreground font-normal"> · {it.description}</span>
                      )}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      ล็อต {it.lotNumber || "-"} · {it.lotName} · {it.supplierName}
                      {it.piNumber ? ` (${it.piNumber})` : ""} · {formatThaiDateShort(new Date(it.orderDate))} ·{" "}
                      {it.boxes.toLocaleString("th-TH")} กล่อง
                    </p>
                    <p
                      className={cn(
                        "text-xs",
                        it.match === "variant"
                          ? "text-emerald-700"
                          : it.productId
                            ? "text-muted-foreground"
                            : "text-amber-700"
                      )}
                    >
                      {it.productId
                        ? `${it.match === "variant" ? "✓ " : ""}${it.productName}${it.variantName ? ` · ${it.variantName}` : ""}`
                        : "ยังไม่จับคู่สินค้า"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatBaht(it.landedPerBox)}</p>
                    <p className="text-muted-foreground text-xs">/กล่อง</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {hasUnmatched && line.productId && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={link}
                onChange={(e) => setLink(e.target.checked)}
              />
              ถ้าเลือกรายการที่ยังไม่จับคู่ ให้จับคู่กับ {line.productName}
              {line.colorVariantName ? ` · ${line.colorVariantName}` : ""} ในล็อตด้วย (บิลอื่นจะได้ต้นทุนอัตโนมัติ)
            </label>
          )}

          {selected.length > 0 && (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">ล็อตที่เลือก</p>
              {selected.map((p) => (
                <div key={p.lotItemId} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{p.lotLabel}</span>
                  <span className="text-muted-foreground hidden tabular-nums sm:inline">{formatBaht(p.landedPerBox)} ×</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    className="h-8 w-20 text-right"
                    value={p.boxes || ""}
                    onChange={(e) => setBoxes(p.lotItemId, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  />
                  <span className="text-muted-foreground text-xs">กล่อง</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="เอาออก"
                    onClick={() => setSelected((prev) => prev.filter((x) => x.lotItemId !== p.lotItemId))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                <p className={cn("tabular-nums", chosenBoxes !== line.quantity && "text-amber-700")}>
                  รวม {chosenBoxes.toLocaleString("th-TH")}/{line.quantity.toLocaleString("th-TH")} กล่อง
                  {blended != null && <> · ต้นทุนเฉลี่ย <b>{formatBaht(blended)}</b>/กล่อง</>}
                  {chosenBoxes !== line.quantity && <span className="block text-xs">จำนวนกล่องไม่เท่ากับในบิล</span>}
                </p>
                <Button type="button" onClick={apply} disabled={blended == null || isLinking}>
                  {isLinking && <Loader2 className="size-4 animate-spin" />}
                  ใช้ต้นทุนนี้
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
