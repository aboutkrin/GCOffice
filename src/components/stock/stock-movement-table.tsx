"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { formatThaiDateTime } from "@/lib/thai-date";
import {
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_MOVEMENT_TYPE_COLORS,
} from "@/lib/constants";

import { Button } from "@/components/ui/button";
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

interface StockMovementTableProps {
  movements: any[];
  total: number;
  page: number;
  totalPages: number;
  showProduct?: boolean;
  typeFilter?: string;
}

export function StockMovementTable({
  movements,
  total,
  page,
  totalPages,
  showProduct = true,
  typeFilter = "",
}: StockMovementTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "createdAt",
      header: "วันที่",
      cell: ({ row }) => formatThaiDateTime(new Date(row.original.createdAt)),
    },
    ...(showProduct
      ? [
          {
            accessorKey: "product.name",
            header: "สินค้า",
            cell: ({ row }: any) => (
              <div>
                <div className="font-medium">
                  {row.original.product?.name}
                  {row.original.colorVariant && (
                    <span className="text-muted-foreground font-normal">
                      {" "}— {row.original.colorVariant.name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.original.product?.sku}
                </div>
              </div>
            ),
          } as ColumnDef<any>,
        ]
      : []),
    {
      accessorKey: "type",
      header: "ประเภท",
      cell: ({ row }) => (
        <Badge className={STOCK_MOVEMENT_TYPE_COLORS[row.original.type]}>
          {STOCK_MOVEMENT_TYPE_LABELS[row.original.type]}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity",
      header: "จำนวน",
      cell: ({ row }) => {
        const type = row.original.type;
        const qty = row.original.quantity;
        const isNegative = type === "OUT";
        return (
          <span
            className={`font-mono font-medium ${isNegative ? "text-red-600" : "text-green-600"}`}
          >
            {isNegative ? `-${qty}` : `+${qty}`}
          </span>
        );
      },
    },
    {
      accessorKey: "balanceAfter",
      header: "คงเหลือ",
      cell: ({ row }) => (
        <span className="font-mono">{row.original.balanceAfter}</span>
      ),
    },
    {
      accessorKey: "reason",
      header: "เหตุผล",
      cell: ({ row }) => row.original.reason ?? "-",
    },
    {
      accessorKey: "reference",
      header: "อ้างอิง",
      cell: ({ row }) => row.original.reference ?? "-",
    },
    {
      accessorKey: "lotNumber",
      header: "Lot",
      cell: ({ row }) => row.original.lotNumber ?? "-",
    },
  ];

  const table = useReactTable({
    data: movements,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const startItem = (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, total);

  return (
    <div className="space-y-4">
      {/* Type filter */}
      <div className="flex items-center gap-3">
        <Select
          value={typeFilter || "all"}
          onValueChange={(value) =>
            updateParams({ type: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ประเภททั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ประเภททั้งหมด</SelectItem>
            <SelectItem value="IN">รับเข้า</SelectItem>
            <SelectItem value="OUT">เบิกออก</SelectItem>
            <SelectItem value="ADJUSTMENT">ปรับยอด</SelectItem>
            <SelectItem value="INITIAL">ตั้งต้น</SelectItem>
          </SelectContent>
        </Select>
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
                      ["reason", "reference", "lotNumber"].includes(header.id)
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        ["reason", "reference", "lotNumber"].includes(cell.column.id)
                          ? "hidden md:table-cell"
                          : ""
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  ไม่พบประวัติการเคลื่อนไหว
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
