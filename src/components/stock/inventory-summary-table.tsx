"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  X,
} from "lucide-react";

import { formatThaiDateShort } from "@/lib/thai-date";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

interface OrderDetail {
  documentId: string;
  documentNumber: string;
  customerName: string;
  quantity: number;
  documentDate: string;
}

interface SummaryItem {
  productId: string;
  productSku: string;
  productName: string;
  productImage: string | null;
  colorVariantId: string | null;
  colorVariantName: string | null;
  currentStock: number;
  totalOrdered: number;
  shortage: number;
  orders: OrderDetail[];
}

interface InventorySummaryTableProps {
  items: SummaryItem[];
  filters: {
    search: string;
    shortageOnly: boolean;
  };
}

export function InventorySummaryTable({
  items,
  filters,
}: InventorySummaryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.search);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Dialog state
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustVariant, setAdjustVariant] = useState<any>(null);

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
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchValue });
  };

  const toggleExpand = (key: string) => {
    const next = new Set(expandedRows);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedRows(next);
  };

  const rowKey = (item: SummaryItem) =>
    item.colorVariantName
      ? `${item.productSku}::${item.colorVariantName}`
      : item.productSku;

  const clearFilters = () => {
    setSearchValue("");
    router.push(pathname);
  };

  const hasActiveFilters = filters.search || filters.shortageOnly;

  return (
    <div className="space-y-4">
      {/* Filters */}
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
        <div className="flex items-center gap-2">
          <Switch
            id="shortage-only"
            checked={filters.shortageOnly}
            onCheckedChange={(checked) =>
              updateParams({ shortageOnly: checked ? "true" : "" })
            }
          />
          <Label htmlFor="shortage-only" className="text-sm cursor-pointer">
            เฉพาะสต็อคไม่พอ
          </Label>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="size-4" />
            ล้างตัวกรอง
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead className="hidden md:table-cell w-12">รูป</TableHead>
              <TableHead>สินค้า</TableHead>
              <TableHead className="text-right">สต็อคปัจจุบัน</TableHead>
              <TableHead className="text-right">สั่งซื้อรวม</TableHead>
              <TableHead className="text-right">ต้องสั่งเพิ่ม</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-20">ดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length ? (
              items.map((item) => {
                const key = rowKey(item);
                const isExpanded = expandedRows.has(key);
                return (
                  <>
                    <TableRow key={key}>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => toggleExpand(key)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-3.5" />
                          ) : (
                            <ChevronDown className="size-3.5" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            width={40}
                            height={40}
                            className="rounded object-cover size-10"
                          />
                        ) : (
                          <div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                            N/A
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.productSku}
                            {item.colorVariantName && (
                              <> — สี: {item.colorVariantName}</>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-medium">
                          {item.currentStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-medium">
                          {item.totalOrdered}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.shortage > 0 ? (
                          <span className="font-mono font-medium text-red-600">
                            {item.shortage}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.shortage > 0 ? (
                          <Badge variant="destructive">ไม่เพียงพอ</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            เพียงพอ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustProduct({
                              id: item.productId,
                              name: item.productName,
                              sku: item.productSku,
                              stockQuantity: item.currentStock,
                            });
                            setAdjustVariant(
                              item.colorVariantId
                                ? {
                                    id: item.colorVariantId,
                                    name: item.colorVariantName,
                                    stockQuantity: item.currentStock,
                                  }
                                : null,
                            );
                          }}
                        >
                          <Plus className="size-3.5" />
                          รับเข้า
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <>
                        <TableRow className="bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={7} className="p-0">
                            <div className="px-4 py-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                รายละเอียดคำสั่งซื้อ ({item.orders.length} รายการ)
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow className="text-xs">
                                    <TableHead className="py-1.5">เลขที่เอกสาร</TableHead>
                                    <TableHead className="py-1.5">ลูกค้า</TableHead>
                                    <TableHead className="py-1.5 text-right">จำนวนสั่ง</TableHead>
                                    <TableHead className="py-1.5">วันที่</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {item.orders.map((order) => (
                                    <TableRow key={`${key}-${order.documentId}`} className="text-sm">
                                      <TableCell className="py-1.5">
                                        <Link
                                          href={`/quotations/${order.documentId}`}
                                          className="text-blue-600 hover:underline"
                                        >
                                          {order.documentNumber}
                                        </Link>
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        {order.customerName}
                                      </TableCell>
                                      <TableCell className="py-1.5 text-right font-mono">
                                        {order.quantity}
                                      </TableCell>
                                      <TableCell className="py-1.5">
                                        {formatThaiDateShort(new Date(order.documentDate))}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  ไม่พบข้อมูลคำสั่งซื้อ
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total count */}
      {items.length > 0 && (
        <p className="text-sm text-muted-foreground">
          ทั้งหมด {items.length} รายการ
        </p>
      )}

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={!!adjustProduct}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustProduct(null);
            setAdjustVariant(null);
          }
        }}
        mode="in"
        product={adjustProduct}
        colorVariant={adjustVariant}
      />
    </div>
  );
}
