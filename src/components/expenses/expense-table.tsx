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
import { MoreHorizontal, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { deleteExpense } from "@/actions/expense-actions";
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

interface ExpenseTableProps {
  expenses: any[];
  categories: any[];
  totalAmount: number;
  currentMonth?: number;
  currentYear: number;
  currentCategoryId?: string;
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

export function ExpenseTable({
  expenses,
  categories,
  totalAmount,
  currentMonth,
  currentYear,
  currentCategoryId,
}: ExpenseTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [globalFilter, setGlobalFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateFilters(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "month") {
      // Always keep month param so "all" is distinguishable from "no param" (default to current Thai month)
      params.set(key, value);
    } else if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/expenses?${params.toString()}`);
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "expenseDate",
      header: "วันที่",
      cell: ({ row }) => formatThaiDate(new Date(row.original.expenseDate), "short"),
      enableGlobalFilter: false,
    },
    {
      accessorKey: "name",
      header: "รายการ",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.notes && (
            <div className="text-xs text-muted-foreground line-clamp-1">
              {row.original.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category.name",
      header: "หมวดหมู่",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.category?.name ?? "-"}</Badge>
      ),
      enableGlobalFilter: false,
    },
    {
      accessorKey: "paymentMethod",
      header: "วิธีการชำระ",
      cell: ({ row }) => (
        <Badge variant="outline">
          {PAYMENT_METHOD_LABELS[row.original.paymentMethod] ?? "-"}
        </Badge>
      ),
      enableGlobalFilter: false,
    },
    {
      accessorKey: "amount",
      header: "จำนวนเงิน",
      cell: ({ row }) => (
        <span className="font-medium">{formatBaht(row.original.amount)}</span>
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
              <Link href={`/expenses/${row.original.id}`}>
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
    data: expenses,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const name = String(row.original.name ?? "").toLowerCase();
      const notes = String(row.original.notes ?? "").toLowerCase();
      return name.includes(search) || notes.includes(search);
    },
  });

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      try {
        await deleteExpense(deleteId);
        toast.success("ลบค่าใช้จ่ายเรียบร้อยแล้ว");
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
      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm text-muted-foreground">
          ยอดรวมค่าใช้จ่าย
          {currentMonth ? ` ${THAI_MONTHS[currentMonth - 1]}` : ""} พ.ศ.{" "}
          {buddhistYear}
        </div>
        <div className="text-2xl font-bold text-green-600">
          {formatBaht(totalAmount)}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาค่าใช้จ่าย..."
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

        <Select
          value={currentCategoryId ?? "all"}
          onValueChange={(v) => updateFilters("categoryId", v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ทุกหมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
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
                      header.id === "category.name" || header.id === "paymentMethod"
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "category.name" || cell.column.id === "paymentMethod"
                          ? "hidden md:table-cell"
                          : ""
                      }
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
                  ไม่พบข้อมูลค่าใช้จ่าย
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
              คุณต้องการลบค่าใช้จ่ายนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
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
