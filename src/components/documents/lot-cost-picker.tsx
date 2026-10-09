"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, PackageSearch, Search } from "lucide-react";

import { linkLotItemToProduct, searchLotItemsForCostAction } from "@/actions/import-lot-actions";
import type { LotItemOption } from "@/data/import-lots";
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
}

/**
 * Profit card: pick the import lot line a sold item came from. Fills the
 * line's cost with that lot's landed cost per box; a lot line not yet matched
 * to any product can be linked to this product at the same time.
 */
export function LotCostPicker({
  line,
  onPick,
}: {
  line: LotCostPickerLine;
  onPick: (cost: number, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
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

  function pick(it: LotItemOption) {
    const label = `ล็อต ${it.lotNumber || it.lotName} · ${it.supplierCode}`;
    const shouldLink = link && !it.productId && !!line.productId;
    if (!shouldLink) {
      onPick(it.landedPerBox, label);
      setOpen(false);
      return;
    }
    startLinking(async () => {
      const res = await linkLotItemToProduct(it.id, line.productId!, line.colorVariantId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`จับคู่ ${it.supplierCode} กับ ${line.productName} แล้ว`);
      onPick(it.landedPerBox, label);
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
              {line.colorVariantName ? ` · ${line.colorVariantName}` : ""} — เลือกรายการในใบ PI
              ที่สินค้านี้มาจาก ระบบจะใส่ต้นทุนต่อกล่อง (รวมค่าขนส่งจีน-ไทยแล้ว) ให้
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
                  onClick={() => pick(it)}
                  className="hover:bg-muted flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm disabled:opacity-50"
                >
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
        </DialogContent>
      </Dialog>
    </>
  );
}
