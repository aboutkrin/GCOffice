"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductThumb } from "@/components/ui/product-thumb";
import { searchProductsWithStockAction } from "@/actions/product-actions";
import type { StockCodeResolution } from "@/lib/stock-code";

export type PickedStockItem = Extract<StockCodeResolution, { kind: "variant" | "product" }>;

interface VariantOption {
  id: string;
  name: string;
  colorHex: string | null;
  stockQuantity: number;
  sku?: string | null;
  imageUrl?: string | null;
}

interface StockVariantChooserProps {
  product: { id: string; name: string; sku: string };
  variants: VariantOption[];
  onPick: (item: PickedStockItem) => void;
  onCancel?: () => void;
}

/** Colour buttons for a product whose stock is tracked per colour. */
export function StockVariantChooser({ product, variants, onPick, onCancel }: StockVariantChooserProps) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">
          <span className="font-medium">{product.name}</span>
          <span className="text-muted-foreground"> — เลือกสี</span>
        </p>
        {onCancel && (
          <Button type="button" variant="ghost" size="icon-xs" onClick={onCancel}>
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => (
          <Button
            key={v.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto py-1.5"
            onClick={() =>
              onPick({
                kind: "variant",
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                colorVariantId: v.id,
                colorVariantName: v.name,
                colorVariantSku: v.sku ?? null,
                stockQuantity: v.stockQuantity,
              })
            }
          >
            <span
              className="size-4 rounded-full border shrink-0"
              style={{ backgroundColor: v.colorHex ?? undefined }}
            />
            <span>{v.name}</span>
            {v.sku && <span className="font-mono text-xs text-muted-foreground">{v.sku}</span>}
            <span className="font-mono text-xs text-muted-foreground">({v.stockQuantity})</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

interface StockProductSearchProps {
  onPick: (item: PickedStockItem) => void;
  disabled?: boolean;
}

/** Fallback for items without a QR label: search by name/code, then pick a colour. */
export function StockProductSearch({ onPick, disabled }: StockProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchProductsWithStockAction(q);
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const pick = (item: PickedStockItem) => {
    onPick(item);
    setQuery("");
    setResults([]);
    setExpanded(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        )}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="พิมพ์ชื่อหรือรหัสสินค้า..."
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {query.trim() && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">ไม่พบสินค้า</p>
      )}

      {results.length > 0 && (
        <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
          {results.map((p) => {
            const variants: VariantOption[] = p.colorVariants ?? [];
            const hasVariants = variants.length > 0;
            return (
              <div key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 disabled:opacity-50"
                  onClick={() => {
                    if (hasVariants) {
                      setExpanded(expanded === p.id ? null : p.id);
                    } else {
                      pick({
                        kind: "product",
                        productId: p.id,
                        productName: p.name,
                        productSku: p.sku,
                        stockQuantity: p.stockQuantity,
                      });
                    }
                  }}
                >
                  <ProductThumb src={p.imageUrl} alt={p.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {hasVariants ? `${variants.length} สี · ` : ""}คงเหลือ {p.stockQuantity}
                  </span>
                </button>
                {hasVariants && expanded === p.id && (
                  <div className="px-3 pb-3">
                    <StockVariantChooser product={p} variants={variants} onPick={pick} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
