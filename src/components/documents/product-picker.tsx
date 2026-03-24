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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  searchProductsAction,
  getProductCategoriesAction,
} from "@/actions/product-actions";
import { Search, Package, ArrowLeft } from "lucide-react";
import { formatNumber } from "@/lib/thai-currency";

interface ColorVariant {
  id: string;
  name: string;
  colorHex?: string | null;
  imageUrl?: string | null;
  stockQuantity: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
  colorVariants?: ColorVariant[];
}

interface Category {
  id: string;
  name: string;
}

interface ProductPickerProps {
  onSelect: (product: {
    sku: string;
    name: string;
    basePrice: number;
    imageUrl?: string;
    colorVariantName?: string;
  }) => void;
  children?: React.ReactNode;
}

export function ProductPicker({ onSelect, children }: ProductPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!open) return;
    getProductCategoriesAction().then((data) =>
      setCategories(data.map((c) => ({ id: c.id, name: c.name })))
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchProductsAction(
          query,
          categoryId || undefined
        );
        setProducts(result as unknown as Product[]);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, categoryId, open]);

  const handleSelect = (product: Product) => {
    if (product.colorVariants && product.colorVariants.length > 0) {
      // Show variant selection step
      setSelectedProduct(product);
    } else {
      // No variants, select directly
      finalizeSelect(product);
    }
  };

  const finalizeSelect = (product: Product, variantName?: string, variantImageUrl?: string) => {
    onSelect({
      sku: product.sku,
      name: product.name,
      basePrice: Number(product.basePrice),
      imageUrl: variantImageUrl || product.imageUrl || undefined,
      colorVariantName: variantName,
    });
    setOpen(false);
    resetState();
  };

  const resetState = () => {
    setQuery("");
    setCategoryId("");
    setSelectedProduct(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetState();
      }}
    >
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
          <DialogTitle>
            {selectedProduct ? "เลือกสีสินค้า" : "เลือกสินค้า"}
          </DialogTitle>
        </DialogHeader>

        {selectedProduct ? (
          // Variant selection step
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-3"
              onClick={() => setSelectedProduct(null)}
            >
              <ArrowLeft className="size-4" />
              กลับไปเลือกสินค้า
            </Button>
            <p className="text-sm text-muted-foreground mb-3">
              {selectedProduct.name} ({selectedProduct.sku})
            </p>
            <ScrollArea className="h-[280px]">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => finalizeSelect(selectedProduct)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                >
                  <div className="size-8 rounded-full border bg-muted flex items-center justify-center">
                    <Package className="size-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm">ไม่ระบุสี</span>
                </button>
                {selectedProduct.colorVariants!.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() =>
                      finalizeSelect(selectedProduct, variant.name, variant.imageUrl || undefined)
                    }
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                  >
                    {variant.imageUrl ? (
                      <img
                        src={variant.imageUrl}
                        alt={variant.name}
                        className="size-8 rounded object-cover border shrink-0"
                      />
                    ) : (
                      <div className="size-8 rounded border bg-muted flex items-center justify-center shrink-0">
                        <Package className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    {variant.colorHex ? (
                      <div
                        className="size-8 rounded-full border shrink-0"
                        style={{ backgroundColor: variant.colorHex }}
                      />
                    ) : (
                      <div className="size-8 rounded-full border bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{variant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        สต็อค: {variant.stockQuantity}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Product selection step
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาชื่อสินค้าหรือรหัส SKU..."
                  className="pl-9"
                />
              </div>
              <Select
                value={categoryId}
                onValueChange={(value) =>
                  setCategoryId(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[160px] shrink-0">
                  <SelectValue placeholder="ทุกหมวดหมู่" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                          {product.colorVariants &&
                            product.colorVariants.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({product.colorVariants.length} สี)
                              </span>
                            )}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
