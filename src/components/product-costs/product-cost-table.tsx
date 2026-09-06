"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import { Search, ChevronLeft, ChevronRight, X, Save, RefreshCw, Package } from "lucide-react";
import { toast } from "sonner";

import { formatNumber } from "@/lib/thai-currency";
import { updateProductCost } from "@/actions/product-actions";
import { type ProductForCost } from "@/data/products";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductCategory {
  id: string;
  name: string;
  _count: { products: number };
}

interface ProductCostTableProps {
  products: ProductForCost[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  categories: ProductCategory[];
  selectedCategoryId: string;
}

interface EditingRow {
  costPrice: string;
  exchangeRate: string;
  weightPerBox: string;
  shippingCostPerBox: string;
}

export function ProductCostTable({
  products,
  total,
  page,
  totalPages,
  search,
  categories,
  selectedCategoryId,
}: ProductCostTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const [isPending, startTransition] = useTransition();
  const [editingRows, setEditingRows] = useState<Record<string, EditingRow>>({});
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  // Fetch exchange rate on mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    setIsLoadingRate(true);
    try {
      const response = await fetch("/api/exchange-rate");
      const data = await response.json();
      if (data.rate) {
        setCurrentExchangeRate(data.rate);
        if (data.fallback) {
          toast.info("ใช้เรทสำรอง เนื่องจากไม่สามารถดึงเรทปัจจุบันได้");
        }
      }
    } catch {
      toast.error("ไม่สามารถดึงอัตราแลกเปลี่ยนได้");
    } finally {
      setIsLoadingRate(false);
    }
  };

  const applyCurrentRateToAll = () => {
    if (!currentExchangeRate) return;

    const newEditingRows: Record<string, EditingRow> = {};
    for (const product of products) {
      const existing = editingRows[product.id] || getEditingRow(product);
      // Only apply to rows that don't have a rate set yet
      if (!existing.exchangeRate || existing.exchangeRate === "0" || existing.exchangeRate === "") {
        newEditingRows[product.id] = {
          ...existing,
          exchangeRate: currentExchangeRate.toFixed(4),
        };
      }
    }

    if (Object.keys(newEditingRows).length > 0) {
      setEditingRows((prev) => ({ ...prev, ...newEditingRows }));
      toast.success("ใส่เรทปัจจุบันให้สินค้าที่ยังไม่มีเรทแล้ว");
    } else {
      toast.info("ทุกสินค้ามีเรทอยู่แล้ว");
    }
  };

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      if (!("page" in updates)) {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchValue });
  };

  const clearFilters = () => {
    setSearchValue("");
    router.push(pathname);
  };

  const handleCategoryChange = (categoryId: string) => {
    updateParams({ category: categoryId === selectedCategoryId ? "" : categoryId });
  };

  const getEditingRow = (product: ProductForCost): EditingRow => {
    if (editingRows[product.id]) {
      return editingRows[product.id];
    }
    return {
      costPrice: product.costPrice?.toString() ?? "",
      exchangeRate: product.exchangeRate?.toString() ?? "",
      weightPerBox: product.weightPerBox?.toString() ?? "",
      shippingCostPerBox: product.shippingCostPerBox?.toString() ?? "",
    };
  };

  const updateEditingRow = (productId: string, field: keyof EditingRow, value: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [productId]: {
        ...getEditingRow(products.find((p) => p.id === productId)!),
        [field]: value,
      },
    }));
  };

  const calculateThaiPrice = (costPrice: string, exchangeRate: string): number | null => {
    const cost = parseFloat(costPrice);
    const rate = parseFloat(exchangeRate);
    if (isNaN(cost) || isNaN(rate)) return null;
    return cost * rate;
  };

  const calculateShippingCost = (shippingRate: string, weight: string): number | null => {
    const rate = parseFloat(shippingRate);
    const w = parseFloat(weight);
    if (isNaN(rate) || isNaN(w)) return null;
    return rate * w;
  };

  const calculateTotalCost = (
    costPrice: string,
    exchangeRate: string,
    shippingRate: string,
    weight: string
  ): number | null => {
    const thaiPrice = calculateThaiPrice(costPrice, exchangeRate);
    const shippingCost = calculateShippingCost(shippingRate, weight);
    if (thaiPrice === null) return null;
    return thaiPrice + (shippingCost ?? 0);
  };

  const calculateProfit = (
    basePrice: number,
    costPrice: string,
    exchangeRate: string,
    shippingRate: string,
    weight: string
  ): number | null => {
    const totalCost = calculateTotalCost(costPrice, exchangeRate, shippingRate, weight);
    if (totalCost === null) return null;
    return basePrice - totalCost;
  };

  const hasChanges = (product: ProductForCost): boolean => {
    const editing = editingRows[product.id];
    if (!editing) return false;

    const costChanged = editing.costPrice !== (product.costPrice?.toString() ?? "");
    const rateChanged = editing.exchangeRate !== (product.exchangeRate?.toString() ?? "");
    const weightChanged = editing.weightPerBox !== (product.weightPerBox?.toString() ?? "");
    const shippingChanged = editing.shippingCostPerBox !== (product.shippingCostPerBox?.toString() ?? "");

    return costChanged || rateChanged || weightChanged || shippingChanged;
  };

  const handleSave = (product: ProductForCost) => {
    const editing = getEditingRow(product);

    startTransition(async () => {
      try {
        await updateProductCost(product.id, {
          costPrice: editing.costPrice ? parseFloat(editing.costPrice) : null,
          exchangeRate: editing.exchangeRate ? parseFloat(editing.exchangeRate) : null,
          weightPerBox: editing.weightPerBox ? parseFloat(editing.weightPerBox) : null,
          shippingCostPerBox: editing.shippingCostPerBox ? parseFloat(editing.shippingCostPerBox) : null,
        });

        // Clear the editing state for this row
        setEditingRows((prev) => {
          const newState = { ...prev };
          delete newState[product.id];
          return newState;
        });

        toast.success("บันทึกข้อมูลต้นทุนเรียบร้อยแล้ว");
      } catch {
        toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      }
    });
  };

  const startItem = (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, total);

  return (
    <div className="space-y-4">
      {/* Search and Exchange Rate */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อหรือรหัสสินค้า..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </form>
          {(search || selectedCategoryId) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" />
              ล้างตัวกรอง
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            เรทปัจจุบัน:{" "}
            <span className="font-medium text-foreground">
              {currentExchangeRate ? `${currentExchangeRate.toFixed(4)} ฿/¥` : "-"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchExchangeRate}
            disabled={isLoadingRate}
          >
            <RefreshCw className={`size-4 ${isLoadingRate ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={applyCurrentRateToAll}
            disabled={!currentExchangeRate}
          >
            ใส่เรทให้ทุกสินค้า
          </Button>
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">หมวดหมู่:</span>
          <Button
            variant={selectedCategoryId === "" ? "default" : "outline"}
            size="sm"
            onClick={() => updateParams({ category: "" })}
          >
            ทั้งหมด
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategoryId === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.name}
              <span className="ml-1 text-xs opacity-70">({cat._count.products})</span>
            </Button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">รูป</TableHead>
              <TableHead className="w-[100px]">รหัส</TableHead>
              <TableHead className="min-w-[180px]">ชื่อสินค้า</TableHead>
              <TableHead className="w-[100px] text-right">ต้นทุน (CNY)</TableHead>
              <TableHead className="w-[100px] text-right">เรท (฿/¥)</TableHead>
              <TableHead className="w-[100px] text-right">ต้นทุน (THB)</TableHead>
              <TableHead className="w-[80px] text-right">นน./กล่อง</TableHead>
              <TableHead className="w-[100px] text-right">เรทค่าส่ง/กก.</TableHead>
              <TableHead className="w-[100px] text-right">ค่าส่ง/กล่อง</TableHead>
              <TableHead className="w-[100px] text-right">รวมต้นทุน</TableHead>
              <TableHead className="w-[100px] text-right">ราคาขาย</TableHead>
              <TableHead className="w-[100px] text-right">กำไร/กล่อง</TableHead>
              <TableHead className="w-[80px] text-right">กำไร %</TableHead>
              <TableHead className="w-[60px]">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product) => {
                const editing = getEditingRow(product);
                const thaiPrice = calculateThaiPrice(editing.costPrice, editing.exchangeRate);
                const shippingCost = calculateShippingCost(editing.shippingCostPerBox, editing.weightPerBox);
                const totalCost = calculateTotalCost(
                  editing.costPrice,
                  editing.exchangeRate,
                  editing.shippingCostPerBox,
                  editing.weightPerBox
                );
                const profit = calculateProfit(
                  product.basePrice,
                  editing.costPrice,
                  editing.exchangeRate,
                  editing.shippingCostPerBox,
                  editing.weightPerBox
                );
                const changed = hasChanges(product);

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.imageUrl ? (
                        <div className="relative size-10 rounded overflow-hidden bg-muted">
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="size-10 rounded bg-muted flex items-center justify-center">
                          <Package className="size-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="text-sm">{product.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editing.costPrice}
                        onChange={(e) => updateEditingRow(product.id, "costPrice", e.target.value)}
                        className="w-full text-right h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="0.0000"
                        value={editing.exchangeRate}
                        onChange={(e) => updateEditingRow(product.id, "exchangeRate", e.target.value)}
                        className="w-full text-right h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {thaiPrice !== null ? formatNumber(thaiPrice) : "-"}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editing.weightPerBox}
                        onChange={(e) => updateEditingRow(product.id, "weightPerBox", e.target.value)}
                        className="w-full text-right h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editing.shippingCostPerBox}
                        onChange={(e) => updateEditingRow(product.id, "shippingCostPerBox", e.target.value)}
                        className="w-full text-right h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {shippingCost !== null ? formatNumber(shippingCost) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {totalCost !== null ? formatNumber(totalCost) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm text-blue-600">
                      {formatNumber(product.basePrice)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium text-sm ${
                        profit !== null
                          ? profit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          : ""
                      }`}
                    >
                      {profit !== null ? formatNumber(profit) : "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium text-sm ${
                        profit !== null && totalCost !== null && totalCost > 0
                          ? profit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                          : ""
                      }`}
                    >
                      {profit !== null && totalCost !== null && totalCost > 0
                        ? `${((profit / totalCost) * 100).toFixed(1)}%`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={changed ? "default" : "ghost"}
                        size="icon-xs"
                        onClick={() => handleSave(product)}
                        disabled={isPending || !changed}
                      >
                        <Save className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={14} className="h-24 text-center">
                  ไม่พบข้อมูลสินค้า
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            แสดง {startItem}-{endItem} จาก {total} รายการ
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <span className="text-sm text-muted-foreground">
              หน้า {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              ถัดไป
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
