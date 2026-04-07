"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Minus,
  History,
  Palette,
} from "lucide-react";

import {
  STOCK_STATUS_LABELS,
  STOCK_STATUS_COLORS,
} from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

interface StockTableProps {
  products: any[];
  categories: any[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    search: string;
    categoryId: string;
    stockFilter: string;
  };
}

function getStockStatus(product: any): string {
  if (product.stockQuantity === 0) return "OUT_OF_STOCK";
  if (product.stockQuantity <= product.lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

export function StockTable({
  products,
  categories,
  total,
  page,
  totalPages,
  filters,
}: StockTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.search);

  // Dialog state
  const [adjustMode, setAdjustMode] = useState<"in" | "out">("in");
  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustVariant, setAdjustVariant] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
    [router, pathname, searchParams],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchValue });
  };

  const clearFilters = () => {
    setSearchValue("");
    router.push(pathname);
  };

  const hasActiveFilters = filters.search || filters.categoryId || filters.stockFilter;

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "imageUrl",
      header: "รูป",
      cell: ({ row }) => {
        const url = row.original.imageUrl;
        return url ? (
          <Image
            src={url}
            alt={row.original.name}
            width={40}
            height={40}
            className="rounded object-cover size-10"
          />
        ) : (
          <div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
            N/A
          </div>
        );
      },
    },
    {
      accessorKey: "sku",
      header: "รหัส",
    },
    {
      accessorKey: "name",
      header: "ชื่อสินค้า",
      cell: ({ row }) => {
        const hasVariants = row.original.colorVariants?.length > 0;
        const isExpanded = expandedRows.has(row.original.id);
        return (
          <div className="flex items-center gap-1.5">
            {hasVariants && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                onClick={() => {
                  const next = new Set(expandedRows);
                  if (isExpanded) next.delete(row.original.id);
                  else next.add(row.original.id);
                  setExpandedRows(next);
                }}
              >
                {isExpanded ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </Button>
            )}
            <span>{row.original.name}</span>
            {hasVariants && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                <Palette className="size-3 mr-0.5" />
                {row.original.colorVariants.length} สี
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category.name",
      header: "หมวดหมู่",
      cell: ({ row }) => row.original.category?.name ?? "-",
    },
    {
      accessorKey: "stockQuantity",
      header: "คงเหลือ (กล่อง)",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.original.stockQuantity}
        </span>
      ),
    },
    {
      id: "stockStatus",
      header: "สถานะสต็อค",
      cell: ({ row }) => {
        const status = getStockStatus(row.original);
        return (
          <Badge className={STOCK_STATUS_COLORS[status]}>
            {STOCK_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-xs"
            title="เพิ่มสต็อค"
            onClick={() => {
              setAdjustMode("in");
              setAdjustProduct(row.original);
              setAdjustVariant(null);
            }}
          >
            <Plus className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            title="ลดสต็อค"
            onClick={() => {
              setAdjustMode("out");
              setAdjustProduct(row.original);
              setAdjustVariant(null);
            }}
          >
            <Minus className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            title="ดูประวัติ"
            asChild
          >
            <Link href={`/stock/${row.original.id}`}>
              <History className="size-3.5" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const startItem = (page - 1) * 10 + 1;
  const endItem = Math.min(page * 10, total);

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
        <Select
          value={filters.stockFilter || "all"}
          onValueChange={(value) =>
            updateParams({ stockFilter: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="สถานะสต็อค" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="low_stock">สินค้าใกล้หมด</SelectItem>
            <SelectItem value="out_of_stock">สินค้าหมด</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.categoryId || "all"}
          onValueChange={(value) =>
            updateParams({ categoryId: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="หมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      ["imageUrl", "category.name"].includes(header.id)
                        ? "hidden md:table-cell"
                        : ""
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const product = row.original;
                const isExpanded = expandedRows.has(product.id);
                const variants = product.colorVariants ?? [];
                return (
                  <>
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            ["imageUrl", "category.name"].includes(cell.column.id)
                              ? "hidden md:table-cell"
                              : ""
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && variants.map((variant: any) => {
                      const variantStatus =
                        variant.stockQuantity === 0
                          ? "OUT_OF_STOCK"
                          : variant.stockQuantity <= variant.lowStockThreshold
                            ? "LOW_STOCK"
                            : "IN_STOCK";
                      return (
                        <TableRow key={`variant-${variant.id}`} className="bg-muted/30">
                          <TableCell className="hidden md:table-cell" />
                          <TableCell />
                          <TableCell>
                            <div className="flex items-center gap-2 pl-6">
                              {variant.imageUrl ? (
                                <Image
                                  src={variant.imageUrl}
                                  alt={variant.name}
                                  width={40}
                                  height={40}
                                  className="rounded object-cover size-10 shrink-0"
                                />
                              ) : (
                                <div className="size-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">
                                  N/A
                                </div>
                              )}
                              {variant.colorHex ? (
                                <div
                                  className="size-4 rounded-full border shrink-0"
                                  style={{ backgroundColor: variant.colorHex }}
                                />
                              ) : (
                                <div className="size-4 rounded-full border bg-muted shrink-0" />
                              )}
                              <span className="text-sm">{variant.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell" />
                          <TableCell>
                            <span className="font-mono font-medium">
                              {variant.stockQuantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={STOCK_STATUS_COLORS[variantStatus]}>
                              {STOCK_STATUS_LABELS[variantStatus]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon-xs"
                                title="เพิ่มสต็อค"
                                onClick={() => {
                                  setAdjustMode("in");
                                  setAdjustProduct(product);
                                  setAdjustVariant(variant);
                                }}
                              >
                                <Plus className="size-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon-xs"
                                title="ลดสต็อค"
                                onClick={() => {
                                  setAdjustMode("out");
                                  setAdjustProduct(product);
                                  setAdjustVariant(variant);
                                }}
                              >
                                <Minus className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  ไม่พบข้อมูลสต็อค
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

      {/* Adjustment Dialog */}
      <StockAdjustmentDialog
        open={!!adjustProduct}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustProduct(null);
            setAdjustVariant(null);
          }
        }}
        mode={adjustMode}
        product={adjustProduct}
        colorVariant={adjustVariant}
      />

    </div>
  );
}
