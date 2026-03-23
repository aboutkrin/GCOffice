"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Search, FileText } from "lucide-react";
import { toast } from "sonner";

import { deleteVendorCost } from "@/actions/vendor-cost-actions";
import { formatBaht } from "@/lib/thai-currency";
import { formatThaiDate, getThaiNow } from "@/lib/thai-date";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VendorCostTableProps {
  vendorCosts: any[];
  totalCost: number;
  currentMonth?: number;
  currentYear: number;
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function VendorCostTable({
  vendorCosts,
  totalCost,
  currentMonth,
  currentYear,
}: VendorCostTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateFilters(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "month") {
      params.set(key, value);
    } else if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/vendor-costs?${params.toString()}`);
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "orderDate",
      header: "วันที่สั่งซื้อ",
      cell: ({ row }) =>
        formatThaiDate(new Date(row.original.orderDate), "short"),
      enableGlobalFilter: false,
    },
    {
      accessorKey: "vendorName",
      header: "Vendor",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.vendorName}</div>
          {row.original.orderNumber && (
            <div className="text-xs text-muted-foreground">
              PO: {row.original.orderNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "document.documentNumber",
      header: "เลขที่บิล",
      cell: ({ row }) => {
        const doc = row.original.document;
        if (!doc) return <span className="text-muted-foreground">-</span>;
        return (
          <div>
            <div className="font-medium">{doc.documentNumber}</div>
            <div className="text-xs text-muted-foreground">
              {doc.customer?.companyName || doc.customer?.customerName}
            </div>
          </div>
        );
      },
      enableGlobalFilter: false,
    },
    {
      id: "itemCount",
      header: "รายการ",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.items?.length ?? 0} รายการ
        </Badge>
      ),
      enableGlobalFilter: false,
    },
    {
      accessorKey: "paymentMethod",
      header: "วิธีชำระ",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant="outline" className="text-xs">
            สินค้า: {PAYMENT_METHOD_LABELS[row.original.paymentMethod] ?? "-"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            ค่าส่ง: {PAYMENT_METHOD_LABELS[row.original.shippingPaymentMethod] ?? "-"}
          </Badge>
        </div>
      ),
      enableGlobalFilter: false,
    },
    {
      accessorKey: "totalCost",
      header: "ยอดต้นทุนรวม",
      cell: ({ row }) => (
        <span className="font-medium">
          {formatBaht(row.original.totalCost)}
        </span>
      ),
      enableGlobalFilter: false,
    },
    {
      id: "actions",
      header: "จัดการ",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/vendor-costs/${row.original.id}/edit`}>
                <Pencil className="size-4" />
                แก้ไข
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="size-4" />
              ลบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableGlobalFilter: false,
    },
  ];

  const table = useReactTable({
    data: vendorCosts,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const vendorName = String(row.original.vendorName ?? "").toLowerCase();
      const orderNumber = String(row.original.orderNumber ?? "").toLowerCase();
      const docNumber = String(
        row.original.document?.documentNumber ?? ""
      ).toLowerCase();
      return (
        vendorName.includes(search) ||
        orderNumber.includes(search) ||
        docNumber.includes(search)
      );
    },
  });

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteVendorCost(deleteId);
        toast.success("ลบต้นทุนใบสั่งซื้อเรียบร้อยแล้ว");
      } catch {
        toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      } finally {
        setDeleteId(null);
      }
    });
  }

  const buddhistYear = currentYear + 543;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            ยอดรวมต้นทุนใบสั่งซื้อ
            {currentMonth ? ` ${THAI_MONTHS[currentMonth - 1]}` : ""} พ.ศ.{" "}
            {buddhistYear}
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatBaht(totalCost)}
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/vendor-costs/summary?${searchParams.toString()}`}
          >
            <FileText className="size-4" />
            ดูใบสรุป
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา Vendor, เลขที่ PO, เลขที่บิล..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={currentMonth?.toString() ?? "all"}
          onValueChange={(v) => updateFilters("month", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="เลือกเดือน" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกเดือน</SelectItem>
            {THAI_MONTHS.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentYear.toString()}
          onValueChange={(v) => updateFilters("year", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 5 }, (_, i) => {
              const y = getThaiNow().year - 2 + i;
              return (
                <SelectItem key={y} value={String(y)}>
                  พ.ศ. {y + 543}
                </SelectItem>
              );
            })}
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
                      header.id === "itemCount" ||
                      header.id === "paymentMethod"
                        ? "hidden md:table-cell"
                        : ""
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/vendor-costs/${row.original.id}/print`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "itemCount" ||
                        cell.column.id === "paymentMethod"
                          ? "hidden md:table-cell"
                          : ""
                      }
                      onClick={cell.column.id === "actions" ? (e) => e.stopPropagation() : undefined}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  ไม่พบข้อมูลต้นทุนใบสั่งซื้อ
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบต้นทุนใบสั่งซื้อนี้หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              variant="destructive"
              disabled={isPending}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
