"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, X, Save } from "lucide-react";
import { toast } from "sonner";

import { formatNumber } from "@/lib/thai-currency";
import { updateProductCost } from "@/actions/product-actions";

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

interface ProductForCost {
  id: string;
  sku: string;
  name: string;
  costPrice: number | null;
  exchangeRate: number | null;
  weightPerBox: number | null;
  shippingCostPerBox: number | null;
}

interface ProductCostTableProps {
  products: ProductForCost[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
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
}: ProductCostTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const [isPending, startTransition] = useTransition();
  const [editingRows, setEditingRows] = useState<Record<string, EditingRow>>({});

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
      {/* Search */}
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
        {search && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-4" />
            ล้างการค้นหา
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">รหัส</TableHead>
              <TableHead className="min-w-[200px]">ชื่อสินค้า</TableHead>
              <TableHead className="w-[120px] text-right">ต้นทุน (CNY)</TableHead>
              <TableHead className="w-[120px] text-right">เรท (฿/¥)</TableHead>
              <TableHead className="w-[120px] text-right">ต้นทุน (THB)</TableHead>
              <TableHead className="w-[100px] text-right">นน./กล่อง</TableHead>
              <TableHead className="w-[120px] text-right">ค่าส่ง/กล่อง</TableHead>
              <TableHead className="w-[80px]">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product) => {
                const editing = getEditingRow(product);
                const thaiPrice = calculateThaiPrice(editing.costPrice, editing.exchangeRate);
                const changed = hasChanges(product);

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editing.costPrice}
                        onChange={(e) => updateEditingRow(product.id, "costPrice", e.target.value)}
                        className="w-full text-right h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="0.0000"
                        value={editing.exchangeRate}
                        onChange={(e) => updateEditingRow(product.id, "exchangeRate", e.target.value)}
                        className="w-full text-right h-8"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {thaiPrice !== null ? formatNumber(thaiPrice) : "-"}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editing.weightPerBox}
                        onChange={(e) => updateEditingRow(product.id, "weightPerBox", e.target.value)}
                        className="w-full text-right h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editing.shippingCostPerBox}
                        onChange={(e) => updateEditingRow(product.id, "shippingCostPerBox", e.target.value)}
                        className="w-full text-right h-8"
                      />
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
                <TableCell colSpan={8} className="h-24 text-center">
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
