"use client";

import { useCallback } from "react";
import Link from "next/link";
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
  STOCK_DOCUMENT_STATUS_LABELS,
  STOCK_DOCUMENT_STATUS_COLORS,
} from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StockDocumentTableProps {
  documents: any[];
  total: number;
  page: number;
  totalPages: number;
  basePath: "receive" | "issue" | "count";
  search: string;
}

export function StockDocumentTable({
  documents,
  total,
  page,
  totalPages,
  basePath,
  search,
}: StockDocumentTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      if (!("page" in updates)) params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "documentNumber",
      header: "เลขที่เอกสาร",
      cell: ({ row }) => (
        <Link href={`/stock/${basePath}/${row.original.id}`} className="text-primary hover:underline font-medium">
          {row.original.documentNumber}
        </Link>
      ),
    },
    {
      accessorKey: "documentDate",
      header: "วันที่",
      cell: ({ row }) => formatThaiDateTime(new Date(row.original.documentDate)),
    },
    {
      id: "lineCount",
      header: "รายการ",
      cell: ({ row }) => row.original._count?.lines ?? 0,
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge className={STOCK_DOCUMENT_STATUS_COLORS[row.original.status]}>
          {STOCK_DOCUMENT_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "sourceDocument",
      header: "อ้างอิง",
      cell: ({ row }) =>
        row.original.sourceDocument ? (
          <Link
            href={`/quotations/${row.original.sourceDocument.id}`}
            className="text-muted-foreground hover:underline text-sm"
          >
            {row.original.sourceDocument.documentNumber}
          </Link>
        ) : (
          "-"
        ),
    },
    {
      id: "createdBy",
      header: "ผู้สร้าง",
      cell: ({ row }) => row.original.createdBy?.fullName || row.original.createdBy?.username || "-",
    },
  ];

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const startItem = (page - 1) * 20 + 1;
  const endItem = Math.min(page * 20, total);

  return (
    <div className="space-y-4">
      <Input
        placeholder="ค้นหาเลขที่เอกสาร..."
        defaultValue={search}
        onChange={(e) => updateParams({ search: e.target.value })}
        className="max-w-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  ไม่พบเอกสาร
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
