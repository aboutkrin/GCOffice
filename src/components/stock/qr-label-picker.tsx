"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Search, Minus, Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SummaryExportToolbar } from "@/components/preview/summary-export-toolbar";
import { QrLabelSheet, type LabelItem } from "./qr-label-sheet";
import { generateLabelQrCodesAction } from "@/actions/stock-label-actions";

interface FlatItem {
  stockCode: string;
  productName: string;
  productSku: string;
  colorVariantName?: string | null;
  colorHex?: string | null;
  colorVariantSku?: string | null;
}

interface QrLabelPickerProps {
  products: {
    id: string;
    sku: string;
    stockCode: string;
    name: string;
    colorVariants: {
      id: string;
      name: string;
      colorHex: string | null;
      stockCode: string;
      sku: string | null;
    }[];
  }[];
}

export function QrLabelPicker({ products }: QrLabelPickerProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Map<string, FlatItem & { copies: number }>>(new Map());
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const previewRef = useRef<HTMLDivElement>(null);

  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    for (const product of products) {
      if (product.colorVariants.length === 0) {
        items.push({ stockCode: product.stockCode, productName: product.name, productSku: product.sku });
      } else {
        for (const variant of product.colorVariants) {
          items.push({
            stockCode: variant.stockCode,
            productName: product.name,
            productSku: product.sku,
            colorVariantName: variant.name,
            colorHex: variant.colorHex,
            colorVariantSku: variant.sku,
          });
        }
      }
    }
    return items;
  }, [products]);

  const filtered = useMemo(() => {
    if (!search) return flatItems;
    const q = search.toLowerCase();
    return flatItems.filter(
      (i) =>
        i.productName.toLowerCase().includes(q) ||
        i.productSku.toLowerCase().includes(q) ||
        i.stockCode.toLowerCase().includes(q)
    );
  }, [flatItems, search]);

  const toggle = (item: FlatItem) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.stockCode)) next.delete(item.stockCode);
      else next.set(item.stockCode, { ...item, copies: 1 });
      return next;
    });
  };

  const setCopies = (stockCode: string, copies: number) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const existing = next.get(stockCode);
      if (existing) next.set(stockCode, { ...existing, copies: Math.max(1, copies) });
      return next;
    });
  };

  const buildLabels = () => {
    const codes = [...selected.keys()];
    if (codes.length === 0) {
      setLabelItems([]);
      return;
    }
    startTransition(async () => {
      const qrMap = await generateLabelQrCodesAction(codes);
      const items: LabelItem[] = [];
      for (const item of selected.values()) {
        const qrDataUrl = qrMap[item.stockCode];
        for (let i = 0; i < item.copies; i++) {
          items.push({
            key: `${item.stockCode}-${i}`,
            stockCode: item.stockCode,
            productName: item.productName,
            colorVariantName: item.colorVariantName,
            colorHex: item.colorHex,
            colorVariantSku: item.colorVariantSku,
            qrDataUrl,
          });
        }
      }
      setLabelItems(items);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, SKU หรือรหัสสต็อค..."
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {filtered.map((item) => {
                  const isSelected = selected.has(item.stockCode);
                  return (
                    <button
                      key={item.stockCode}
                      type="button"
                      onClick={() => toggle(item)}
                      className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                        isSelected ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <div
                        className={`size-4 rounded border shrink-0 flex items-center justify-center ${
                          isSelected ? "bg-primary border-primary" : "border-input"
                        }`}
                      >
                        {isSelected && <div className="size-2 rounded-sm bg-primary-foreground" />}
                      </div>
                      {item.colorHex && (
                        <div
                          className="size-4 rounded-full border shrink-0"
                          style={{ backgroundColor: item.colorHex }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {item.productName}
                          {item.colorVariantName && (
                            <span className="text-muted-foreground"> — {item.colorVariantName}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{item.stockCode}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm font-medium">รายการที่เลือก ({selected.size})</p>
            <ScrollArea className="h-[340px]">
              {selected.size === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">ยังไม่ได้เลือกสินค้า</p>
              ) : (
                <div className="space-y-1">
                  {[...selected.values()].map((item) => (
                    <div key={item.stockCode} className="flex items-center gap-2 p-2 rounded-md border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {item.productName}
                          {item.colorVariantName && (
                            <span className="text-muted-foreground"> — {item.colorVariantName}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{item.stockCode}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => setCopies(item.stockCode, item.copies - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.copies}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-xs"
                          onClick={() => setCopies(item.stockCode, item.copies + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => toggle(item)}
                          className="text-destructive"
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                รวม {[...selected.values()].reduce((sum, i) => sum + i.copies, 0)} ป้าย
              </Badge>
              <Button onClick={buildLabels} disabled={selected.size === 0 || isPending}>
                สร้างแผ่นป้าย QR
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {labelItems.length > 0 && (
        <div className="min-h-screen bg-gray-100 print:bg-white -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 print:p-0">
          {Math.ceil(labelItems.length / 12) > 1 && (
            <p className="text-sm text-amber-600 mb-3 print:hidden">
              หลายแผ่น: กรุณาใช้ปุ่ม PDF สำหรับพิมพ์หลายหน้า (พิมพ์โดยตรงจะได้เฉพาะหน้าแรก)
            </p>
          )}
          <QrLabelSheet ref={previewRef} items={labelItems} />
          <div className="h-36 md:h-0 print:hidden" />
          <SummaryExportToolbar previewRef={previewRef} filename="QR-สินค้า" backHref="/stock" />
        </div>
      )}
    </div>
  );
}
