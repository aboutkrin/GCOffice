"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { searchProductsAction } from "@/actions/product-actions";
import { Search, Package } from "lucide-react";
import { formatNumber } from "@/lib/thai-currency";

interface Product {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
}

interface ProductPickerProps {
  onSelect: (product: {
    sku: string;
    name: string;
    basePrice: number;
    imageUrl?: string;
  }) => void;
  children?: React.ReactNode;
}

export function ProductPicker({ onSelect, children }: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchProductsAction(query);
        setProducts(result as unknown as Product[]);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open]);

  const handleSelect = (product: Product) => {
    onSelect({
      sku: product.sku,
      name: product.name,
      basePrice: Number(product.basePrice),
      imageUrl: product.imageUrl || undefined,
    });
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button type="button" variant="outline" size="sm">
            <Package className="h-4 w-4 mr-1" />
            เลือกสินค้า
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>เลือกสินค้า</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อสินค้าหรือรหัส SKU..."
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-[300px]">
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              กำลังค้นหา...
            </div>
          )}
          {!loading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <span>ไม่พบสินค้า</span>
            </div>
          )}
          {!loading && (
            <div className="space-y-1">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-10 w-10 rounded object-cover border"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {formatNumber(product.basePrice)} บาท
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
